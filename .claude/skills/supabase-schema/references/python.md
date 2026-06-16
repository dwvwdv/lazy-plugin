# Supabase Schema — Python Boilerplate

## 安裝

```bash
pip install supabase
```

---

## 基礎 Scoped Client

```python
# lib/supabase.py
import os
from supabase import create_client, Client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

def create_scoped_client(schema: str) -> Client:
    """建立指定 schema 的 Supabase client"""
    client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    # supabase-py 透過 postgrest client 的 schema 設定
    client.postgrest.schema(schema)
    return client

# 每個 app 一個 client
db = create_scoped_client("public")
tools_db = create_scoped_client("tools")
game_db = create_scoped_client("game_backend")
blog_db = create_scoped_client("blog")
```

### 使用方式

```python
from lib.supabase import tools_db, blog_db

# 查詢
response = tools_db.table("configs").select("*").execute()
configs = response.data

# 篩選
response = blog_db.table("posts") \
    .select("id, title, created_at") \
    .order("created_at", desc=True) \
    .limit(10) \
    .execute()

# 新增
response = tools_db.table("configs") \
    .insert({"key": "theme", "value": {"mode": "dark"}}) \
    .execute()

# 更新
response = tools_db.table("configs") \
    .update({"value": {"mode": "light"}}) \
    .eq("key", "theme") \
    .execute()

# 刪除
response = tools_db.table("configs") \
    .delete() \
    .eq("key", "theme") \
    .execute()
```

---

## 替代方案：每次呼叫時指定 schema

如果不想在初始化時固定 schema，可以每次用 `.schema()` 切換：

```python
from supabase import create_client

client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# 每次指定
response = client.schema("tools").table("configs").select("*").execute()
response = client.schema("blog").table("posts").select("*").execute()
```

適合在同一個後端服務需要跨多個 schema 操作的情境。

---

## Service Role（繞過 RLS）

```python
# lib/supabase_admin.py
import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

def create_admin_client(schema: str):
    client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    client.postgrest.schema(schema)
    return client

tools_admin = create_admin_client("tools")
```

---

## 環境變數

```bash
# .env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 只在後端用，不能暴露給前端
```

用 `python-dotenv` 載入：

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## 搭配 FastAPI 的完整範例

```python
# main.py
from fastapi import FastAPI, Depends
from lib.supabase import tools_db

app = FastAPI()

@app.get("/configs")
async def get_configs():
    response = tools_db.table("configs").select("*").execute()
    return response.data

@app.post("/configs")
async def create_config(key: str, value: dict):
    response = tools_db.table("configs") \
        .insert({"key": key, "value": value}) \
        .execute()
    return response.data[0]
```
