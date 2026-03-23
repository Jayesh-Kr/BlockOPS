from app.app_instance import app
import app.api.routes  # Registers API routes via decorators
import uvicorn

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

