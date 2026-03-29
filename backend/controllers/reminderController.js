const cron = require('node-cron');
const supabase = require('../config/supabase');
const { successResponse, errorResponse } = require('../utils/helpers');
const { executeToolsDirectly, formatToolResponse } = require('../services/directToolExecutor');
const { fireToTelegram } = require('../services/telegramService');
const {
  isUuidLike,
  hasInMemoryConversation,
  appendAssistantMessageToConversation
} = require('./conversationController');

const activeReminderTasks = new Map();

function isOneShot(expr) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(expr || ''));
}

function validateReminderJob(job) {
  const errors = [];

  if (!job.task_type || !['balance', 'portfolio', 'price'].includes(job.task_type)) {
    errors.push('taskType must be one of: balance, portfolio, price');
  }

  if (!job.cron_expression) {
    errors.push('cronExpression is required');
  }

  if (job.task_type !== 'price' && !job.wallet_address) {
    errors.push('walletAddress is required for balance and portfolio reminders');
  }

  if (job.task_type === 'price' && !job.token_query) {
    errors.push('tokenQuery is required for price reminders');
  }

  if (!job.user_id) {
    errors.push('userId is required');
  }

  if (job.delivery_platform === 'web' && !job.conversation_id) {
    errors.push('conversationId is required for web reminders');
  }

  if (job.delivery_platform === 'telegram' && !job.telegram_chat_id) {
    errors.push('telegramChatId is required for Telegram reminders');
  }

  return errors;
}

function buildReminderExecutionPlan(job) {
  switch (job.task_type) {
    case 'balance':
      return {
        type: 'parallel',
        steps: [
          {
            tool: 'get_balance',
            reason: 'Fetch the latest ETH balance for the scheduled wallet check',
            parameters: { address: job.wallet_address },
            depends_on: []
          }
        ]
      };
    case 'portfolio':
      return {
        type: 'parallel',
        steps: [
          {
            tool: 'get_portfolio',
            reason: 'Fetch the latest wallet portfolio snapshot for the scheduled reminder',
            parameters: { address: job.wallet_address },
            depends_on: []
          }
        ]
      };
    case 'price':
      return {
        type: 'parallel',
        steps: [
          {
            tool: 'fetch_price',
            reason: 'Fetch the latest token price for the scheduled reminder',
            parameters: { query: job.token_query },
            depends_on: []
          }
        ]
      };
    default:
      return { type: 'parallel', steps: [] };
  }
}

function buildReminderMessage(job, toolResults) {
  const headline = job.label
    ? `${job.label}\n`
    : job.task_type === 'balance'
      ? 'Scheduled balance update\n'
      : job.task_type === 'portfolio'
        ? 'Scheduled wallet value update\n'
        : 'Scheduled price update\n';

  return `${headline}${formatToolResponse(toolResults)}`.trim();
}

async function persistReminderDeliveryToConversation(job, message, toolResults) {
  if (!job.conversation_id) {
    return;
  }

  if (hasInMemoryConversation(job.conversation_id)) {
    appendAssistantMessageToConversation(job.conversation_id, message, toolResults);
    return;
  }

  if (!supabase || !isUuidLike(job.conversation_id)) {
    return;
  }

  await supabase
    .from('conversation_messages')
    .insert({
      conversation_id: job.conversation_id,
      role: 'assistant',
      content: message,
      tool_calls: toolResults
    })
    .catch((error) => {
      console.error('[Reminder] Failed to persist reminder message to conversation:', error.message);
    });
}

async function persistReminderLog(jobId, payload) {
  if (!supabase) return;

  await supabase
    .from('scheduled_chat_reminder_logs')
    .insert({
      reminder_id: jobId,
      ran_at: new Date().toISOString(),
      success: payload.success,
      message_text: payload.messageText || null,
      error: payload.error || null,
      tool_results: payload.toolResults || null
    })
    .catch((error) => {
      console.error('[Reminder] Failed to persist reminder log:', error.message);
    });
}

async function updateReminderRow(jobId, updatePayload) {
  if (!supabase) return;

  await supabase
    .from('scheduled_chat_reminders')
    .update({
      ...updatePayload,
      updated_at: new Date().toISOString()
    })
    .eq('id', jobId)
    .catch((error) => {
      console.error('[Reminder] Failed to update reminder row:', error.message);
    });
}

async function runReminder(job) {
  const executionPlan = buildReminderExecutionPlan(job);
  let toolResults = {
    tool_calls: [],
    results: []
  };
  let reminderMessage = '';
  let lastError = null;

  try {
    const directExecResult = await executeToolsDirectly(
      { execution_plan: executionPlan },
      job.original_message || '',
      {
        walletAddress: job.wallet_address || null,
        apiKey: process.env.MASTER_API_KEY || null
      }
    );

    toolResults = {
      tool_calls: directExecResult.tool_calls || [],
      results: directExecResult.results || []
    };

    reminderMessage = buildReminderMessage(job, toolResults);

    if (job.delivery_platform === 'telegram' && job.telegram_chat_id) {
      await fireToTelegram(job.telegram_chat_id, reminderMessage);
    }

    if (job.delivery_platform === 'web') {
      await persistReminderDeliveryToConversation(job, reminderMessage, toolResults);
    }
  } catch (error) {
    lastError = error.message || 'Reminder execution failed';
    reminderMessage = `Scheduled reminder failed: ${lastError}`;

    if (job.delivery_platform === 'telegram' && job.telegram_chat_id) {
      await fireToTelegram(job.telegram_chat_id, reminderMessage).catch(() => {});
    }

    if (job.delivery_platform === 'web') {
      await persistReminderDeliveryToConversation(job, reminderMessage, toolResults);
    }
  }

  const success = !lastError && (toolResults.results || []).every((result) => result?.success !== false);
  job.run_count = (job.run_count || 0) + 1;
  job.last_run_at = new Date().toISOString();
  job.last_error = lastError;
  job.last_result_summary = reminderMessage;

  await updateReminderRow(job.id, {
    last_run_at: new Date().toISOString(),
    run_count: job.run_count,
    last_error: lastError,
    last_result_summary: reminderMessage
  });

  await persistReminderLog(job.id, {
    success,
    messageText: reminderMessage,
    error: lastError,
    toolResults
  });
}

function registerReminderTask(job) {
  if (activeReminderTasks.has(job.id)) {
    activeReminderTasks.get(job.id).stop();
    activeReminderTasks.delete(job.id);
  }

  if (job.status !== 'active') return;

  if (isOneShot(job.cron_expression)) {
    const target = new Date(job.cron_expression).getTime();
    if (!Number.isFinite(target)) {
      console.warn(`[Reminder] One-shot reminder ${job.id} has an invalid datetime: ${job.cron_expression}`);
      return;
    }
    const delay = target - Date.now();

    if (delay <= 0) {
      console.warn(`[Reminder] One-shot reminder ${job.id} is in the past, skipping registration.`);
      return;
    }

    const timer = setTimeout(async () => {
      await runReminder(job);
      await updateReminderRow(job.id, { status: 'completed' });
      activeReminderTasks.delete(job.id);
    }, delay);

    activeReminderTasks.set(job.id, { stop: () => clearTimeout(timer) });
  } else {
    if (!cron.validate(job.cron_expression)) {
      console.warn(`[Reminder] Invalid cron expression for reminder ${job.id}: ${job.cron_expression}`);
      return;
    }

    const task = cron.schedule(job.cron_expression, () => runReminder(job), { timezone: 'UTC' });
    activeReminderTasks.set(job.id, task);
  }

  console.log(`[Reminder] Registered reminder ${job.id} (${job.task_type}) with schedule "${job.cron_expression}"`);
}

async function reloadReminderJobsFromDB() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('scheduled_chat_reminders')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;

    (data || []).forEach(registerReminderTask);
    console.log(`[Reminder] Restored ${(data || []).length} active reminder job(s) from DB.`);
  } catch (error) {
    console.error('[Reminder] Failed to restore reminder jobs:', error.message);
  }
}

async function createReminder(req, res) {
  try {
    const {
      taskType,
      walletAddress,
      tokenQuery,
      cronExpression,
      label,
      originalMessage,
      userId,
      conversationId,
      deliveryPlatform,
      telegramChatId
    } = req.body;

    const oneShot = isOneShot(cronExpression);
    const agentId = req.body.agentId || req.apiKey?.agentId || null;

    const reminderRow = {
      agent_id: agentId,
      user_id: userId,
      conversation_id: conversationId || null,
      delivery_platform: deliveryPlatform || 'web',
      telegram_chat_id: telegramChatId || null,
      task_type: taskType,
      wallet_address: walletAddress || null,
      token_query: tokenQuery || null,
      cron_expression: cronExpression,
      label: label || null,
      original_message: originalMessage || null,
      type: oneShot ? 'one_shot' : 'recurring',
      status: 'active',
      run_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const validationErrors = validateReminderJob(reminderRow);
    if (validationErrors.length > 0) {
      return res.status(400).json(errorResponse(validationErrors.join('. ')));
    }

    if (reminderRow.delivery_platform === 'web') {
      const canUsePersistentConversation = !!supabase && isUuidLike(reminderRow.conversation_id);
      const canUseMemoryConversation = !!reminderRow.conversation_id && hasInMemoryConversation(reminderRow.conversation_id);

      if (!canUsePersistentConversation && !canUseMemoryConversation) {
        return res.status(400).json(errorResponse('Web reminders need an active conversation id from this chat session.'));
      }
    }

    if (!oneShot && !cron.validate(cronExpression)) {
      return res.status(400).json(errorResponse(
        `Invalid cronExpression "${cronExpression}". Use a 5-field cron string or an ISO datetime string.`
      ));
    }

    if (oneShot && Number.isNaN(new Date(cronExpression).getTime())) {
      return res.status(400).json(errorResponse('Invalid one-shot datetime. Use a valid ISO datetime string.'));
    }

    let reminderId;
    let storedReminder = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('scheduled_chat_reminders')
        .insert(reminderRow)
        .select()
        .single();

      if (error) throw new Error(`DB insert failed: ${error.message}`);
      reminderId = data.id;
      storedReminder = data;
      registerReminderTask(data);
    } else {
      reminderId = `mem_${Date.now()}`;
      storedReminder = { ...reminderRow, id: reminderId };
      registerReminderTask(storedReminder);
    }

    const targetDescription = taskType === 'price'
      ? `${tokenQuery} price`
      : `${walletAddress} ${taskType}`;

    return res.status(201).json(successResponse({
      id: reminderId,
      type: storedReminder.type,
      status: storedReminder.status,
      taskType,
      walletAddress: walletAddress || null,
      tokenQuery: tokenQuery || null,
      cronExpression,
      label: storedReminder.label,
      deliveryPlatform: storedReminder.delivery_platform,
      note: oneShot
        ? `Reminder scheduled once for ${new Date(cronExpression).toISOString()}`
        : `Reminder scheduled for ${targetDescription} on "${cronExpression}" (UTC)`
    }));
  } catch (error) {
    console.error('[Reminder] createReminder error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

async function listReminders(req, res) {
  try {
    if (!supabase) {
      const jobs = Array.from(activeReminderTasks.keys()).map((id) => ({ id, status: 'active', liveStatus: 'running' }));
      return res.json(successResponse({ jobs, total: jobs.length }));
    }

    const userId = req.query.userId || req.body?.userId || null;
    const agentId = req.apiKey?.agentId || req.query.agentId || null;

    let query = supabase
      .from('scheduled_chat_reminders')
      .select('id, agent_id, user_id, conversation_id, delivery_platform, telegram_chat_id, task_type, wallet_address, token_query, cron_expression, label, type, status, run_count, last_run_at, last_error, last_result_summary, created_at')
      .order('created_at', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (agentId) query = query.eq('agent_id', agentId);

    const { data, error } = await query;
    if (error) throw error;

    const jobs = (data || []).map((job) => ({
      ...job,
      liveStatus: activeReminderTasks.has(job.id) ? 'running' : (job.status === 'active' ? 'pending_reload' : job.status)
    }));

    return res.json(successResponse({ jobs, total: jobs.length }));
  } catch (error) {
    console.error('[Reminder] listReminders error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

async function getReminder(req, res) {
  try {
    if (!supabase) {
      return res.status(503).json(errorResponse('Supabase not configured'));
    }

    const { id } = req.params;
    const { data, error } = await supabase
      .from('scheduled_chat_reminders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json(errorResponse('Reminder not found'));
    }

    const { data: logs } = await supabase
      .from('scheduled_chat_reminder_logs')
      .select('ran_at, success, message_text, error')
      .eq('reminder_id', id)
      .order('ran_at', { ascending: false })
      .limit(10);

    return res.json(successResponse({
      ...data,
      logs: logs || [],
      liveStatus: activeReminderTasks.has(id) ? 'running' : data.status
    }));
  } catch (error) {
    console.error('[Reminder] getReminder error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

async function cancelReminder(req, res) {
  try {
    const { id } = req.params;

    if (activeReminderTasks.has(id)) {
      activeReminderTasks.get(id).stop();
      activeReminderTasks.delete(id);
    }

    if (supabase) {
      await supabase
        .from('scheduled_chat_reminders')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .catch((error) => {
          throw new Error(error.message);
        });
    }

    return res.json(successResponse({ id, status: 'cancelled', message: 'Reminder cancelled.' }));
  } catch (error) {
    console.error('[Reminder] cancelReminder error:', error);
    return res.status(500).json(errorResponse(error.message));
  }
}

module.exports = {
  createReminder,
  listReminders,
  getReminder,
  cancelReminder,
  reloadReminderJobsFromDB,
  registerReminderTask
};
