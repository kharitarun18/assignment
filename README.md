# Team Task Manager

A simple task management web app where admins can create projects, assign tasks, and track progress — and team members can view and update their own work. Built with FastAPI on the backend and React on the frontend.


## Running it locally

**Start the backend**

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

The API will be running at `http://localhost:8000` and you can explore the docs at `http://localhost:8000/docs`.

**Start the frontend**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. API calls are automatically forwarded to the backend — no extra config needed.


## Deploying to Railway

**Backend**

1. Push your code to GitHub
2. Create a new Railway project and add a service pointing to your repo
3. Set the root directory to `backend`
4. Use this as the start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
5. No environment variables needed — the app uses SQLite out of the box

**Frontend**

1. Add another Railway service and set the root directory to `frontend`
2. Build command: `npm run build`
3. Start command: `npx serve dist -p $PORT`
4. Add one environment variable: `VITE_API_URL=https://your-backend-url.up.railway.app`

You can also deploy the frontend to Vercel or Netlify if you prefer. Just set the build command to `npm run build`, the output directory to `dist`, and add the same `VITE_API_URL` environment variable.

## User roles

| Role | What they can do |

| Admin | Create, edit, and delete projects and tasks. View everything. Assign tasks to members. |
| Member | View their assigned tasks and update the status on their own work. |


## API reference

| Method | Endpoint | What it does |

| POST | /api/signup | Create a new account |
| POST | /api/login | Log in and get a token |
| GET | /api/me | Get the current user's info |
| GET | /api/users | List all users |
| GET | /api/projects/ | List all projects |
| POST | /api/projects/ | Create a project (admin only) |
| PUT | /api/projects/:id | Update a project (admin only) |
| DELETE | /api/projects/:id | Delete a project (admin only) |
| GET | /api/tasks/ | List tasks |
| POST | /api/tasks/ | Create a task (admin only) |
| PUT | /api/tasks/:id | Update a task |
| DELETE | /api/tasks/:id | Delete a task (admin only) |
| GET | /api/tasks/dashboard | Get task stats for the dashboard |
