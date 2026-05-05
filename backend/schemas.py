from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "member"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    member_ids: Optional[List[int]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[List[int]] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_at: datetime.datetime
    members: List[UserOut] = []

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    status: Optional[str] = "Pending"
    deadline: Optional[datetime.datetime] = None
    project_id: int
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime.datetime] = None
    project_id: Optional[int] = None
    assignee_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[datetime.datetime]
    created_at: datetime.datetime
    project_id: int
    assignee_id: Optional[int]
    assignee: Optional[UserOut]

    class Config:
        from_attributes = True


class SubmissionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    link: Optional[str]
    tech_stack: Optional[str]
    file_path: Optional[str]
    created_at: datetime.datetime
    user_id: int

    class Config:
        from_attributes = True
