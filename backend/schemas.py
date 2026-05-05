from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "member"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    member_ids: Optional[List[int]] = []

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[List[int]] = None

class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime.datetime
    members: List[UserOut] = []

    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "Pending"
    deadline: Optional[datetime.datetime] = None
    project_id: int
    assignee_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    deadline: Optional[datetime.datetime] = None
    assignee_id: Optional[int] = None

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[datetime.datetime]
    project_id: int
    assignee_id: Optional[int]
    created_at: datetime.datetime
    assignee: Optional[UserOut] = None

    class Config:
        from_attributes = True

class SubmissionOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    link: Optional[str]
    tech_stack: Optional[str]
    file_path: Optional[str]
    user_id: int
    created_at: datetime.datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
