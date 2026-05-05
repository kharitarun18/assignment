from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from typing import List, Optional
import datetime

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    now = datetime.datetime.utcnow()

    def base_query():
        q = db.query(models.Task)
        if current_user.role != "admin":
            q = q.filter(models.Task.assignee_id == current_user.id)
        return q

    total = base_query().count()
    completed = base_query().filter(models.Task.status == "Completed").count()
    pending = base_query().filter(models.Task.status == "Pending").count()
    in_progress = base_query().filter(models.Task.status == "In Progress").count()
    overdue = base_query().filter(models.Task.deadline < now, models.Task.status != "Completed").count()

    return {
        "total": total,
        "completed": completed,
        "pending": pending,
        "in_progress": in_progress,
        "overdue": overdue
    }


@router.get("/", response_model=List[schemas.TaskOut])
def get_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    status: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None)
):
    query = db.query(models.Task)

    if current_user.role != "admin":
        query = query.filter(models.Task.assignee_id == current_user.id)

    if status:
        query = query.filter(models.Task.status == status)
    if assignee_id:
        query = query.filter(models.Task.assignee_id == assignee_id)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)

    return query.all()


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if current_user.role != "admin" and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return task


@router.post("/", response_model=schemas.TaskOut)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    project = db.query(models.Project).filter(models.Project.id == data.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    task = models.Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role == "member":
        if task.assignee_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if data.status is not None:
            task.status = data.status
    else:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}
