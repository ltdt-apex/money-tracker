from pydantic import BaseModel


CATEGORIES = [
    "Food & Drinks",
    "Groceries",
    "Transport",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Health",
    "Education",
    "Travel",
    "Other",
]


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str
    date: str


class Expense(BaseModel):
    id: int
    user_id: int
    title: str
    amount: float
    category: str
    date: str
    created_at: str
