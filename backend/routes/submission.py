from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from typing import List, Optional
import os
import uuid

router = APIRouter(prefix="/api/submissions", tags=["submissions"])

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".zip", ".pdf", ".doc", ".docx", ".txt", ".rar"}
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/user", response_model=List[schemas.SubmissionOut])
def get_my_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.Submission).filter(
        models.Submission.user_id == current_user.id
    ).order_by(models.Submission.created_at.desc()).all()


@router.get("/all", response_model=List[schemas.SubmissionOut])
def get_all_submissions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_admin)
):
    return db.query(models.Submission).order_by(models.Submission.created_at.desc()).all()


@router.post("/", response_model=schemas.SubmissionOut)
async def create_submission(
    title: str = Form(...),
    description: str = Form(...),
    link: Optional[str] = Form(None),
    tech_stack: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    file_path = None

    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="File type not allowed")
        unique_name = f"{uuid.uuid4().hex}{ext}"
        save_path = os.path.join(UPLOAD_DIR, unique_name)
        content = await file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        file_path = save_path.replace("\\", "/")

    submission = models.Submission(
        title=title,
        description=description,
        link=link if link and link.strip() else None,
        tech_stack=tech_stack if tech_stack and tech_stack.strip() else None,
        file_path=file_path,
        user_id=current_user.id
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


@router.delete("/{submission_id}")
def delete_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    submission = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    if submission.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    if submission.file_path and os.path.exists(submission.file_path):
        os.remove(submission.file_path)
    db.delete(submission)
    db.commit()
    return {"message": "Submission deleted"}
