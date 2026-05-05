import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import get_db
from typing import Optional, List
import models, schemas, auth
import shutil
import uuid

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

@router.post("/", response_model=schemas.SubmissionOut)
async def create_submission(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    tech_stack: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    file_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(UPLOAD_DIR, unique_name)
        with open(dest, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
        file_path = dest

    submission = models.Submission(
        title=title,
        description=description,
        link=link,
        tech_stack=tech_stack,
        file_path=file_path,
        user_id=current_user.id
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission

@router.get("/user", response_model=List[schemas.SubmissionOut])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Submission).filter(
        models.Submission.user_id == current_user.id
    ).order_by(models.Submission.created_at.desc()).all()

@router.get("/", response_model=List[schemas.SubmissionOut])
def get_all_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    return db.query(models.Submission).order_by(models.Submission.created_at.desc()).all()

@router.delete("/{submission_id}")
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if sub.file_path and os.path.exists(sub.file_path):
        os.remove(sub.file_path)
    db.delete(sub)
    db.commit()
    return {"message": "Submission deleted"}
