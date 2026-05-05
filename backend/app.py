from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine
import models
import os

from routes.user import router as user_router
from routes.project import router as project_router
from routes.task import router as task_router
from routes.submission import router as submission_router

models.Base.metadata.create_all(bind=engine)

os.makedirs("uploads", exist_ok=True)

app = FastAPI(title="Team Task Manager API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(user_router)
app.include_router(project_router)
app.include_router(task_router)
app.include_router(submission_router)


@app.get("/")
def root():
    return {"status": "ok", "message": "Team Task Manager API is running"}
