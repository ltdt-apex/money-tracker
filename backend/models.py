from pydantic import BaseModel


CATEGORIES: dict[str, dict] = {
    "Food & Drinks": {
        "emoji": "🍔",
        "subcategories": {
            "Restaurant": "🍽️",
            "Cafe & Coffee": "☕",
            "Bar & Alcohol": "🍺",
            "Takeout & Delivery": "🥡",
            "Snacks": "🍿",
        },
    },
    "Groceries": {
        "emoji": "🛒",
        "subcategories": {
            "Supermarket": "🛒",
            "Meat & Seafood": "🥩",
            "Fruits & Vegetables": "🥦",
            "Household Supplies": "🧴",
        },
    },
    "Transport": {
        "emoji": "🚗",
        "subcategories": {
            "Fuel": "⛽",
            "Public Transit": "🚌",
            "Taxi & Rideshare": "🚕",
            "Parking": "🅿️",
            "Car Maintenance": "🔧",
        },
    },
    "Shopping": {
        "emoji": "🛍️",
        "subcategories": {
            "Clothing": "👕",
            "Shoes & Accessories": "👟",
            "Electronics": "📱",
            "Gifts": "🎁",
            "Home & Furniture": "🛋️",
        },
    },
    "Entertainment": {
        "emoji": "🎭",
        "subcategories": {
            "Movies & Shows": "🎬",
            "Games": "🎮",
            "Music & Concerts": "🎵",
            "Books": "📚",
            "Gym & Sports": "🏋️",
        },
    },
    "Bills & Utilities": {
        "emoji": "🧾",
        "subcategories": {
            "Electricity": "💡",
            "Water": "💧",
            "Internet & Phone": "📶",
            "Rent & Mortgage": "🏠",
            "Subscriptions": "📺",
        },
    },
    "Health": {
        "emoji": "🏥",
        "subcategories": {
            "Pharmacy": "💊",
            "Doctor & Clinic": "🏥",
            "Dental": "🦷",
            "Vision & Optical": "👓",
            "Wellness": "🧘",
        },
    },
    "Education": {
        "emoji": "🎓",
        "subcategories": {
            "Tuition & Courses": "📖",
            "Supplies & Stationery": "✏️",
            "Software & Tools": "💻",
        },
    },
    "Travel": {
        "emoji": "✈️",
        "subcategories": {
            "Flights": "✈️",
            "Hotels & Lodging": "🏨",
            "Activities & Tours": "🎒",
            "Travel Essentials": "🧳",
        },
    },
    "Income": {
        "emoji": "💰",
        "subcategories": {
            "Salary": "💰",
            "Freelance": "💵",
            "Investments": "📈",
            "Gifts Received": "🎁",
        },
    },
    "Other": {
        "emoji": "📦",
        "subcategories": {
            "Uncategorized": "❓",
            "Fees & Charges": "💸",
            "Pets": "🐾",
            "Donations": "💝",
        },
    },
}

# Flat lookup: subcategory name -> parent category name
SUB_TO_CAT: dict[str, str] = {}
for cat_name, cat_data in CATEGORIES.items():
    for sub_name in cat_data["subcategories"]:
        SUB_TO_CAT[sub_name] = cat_name

ALL_SUBCATEGORIES: set[str] = set(SUB_TO_CAT.keys())


class ProfileCreate(BaseModel):
    name: str
    emoji: str = "💰"


class Profile(BaseModel):
    id: int
    clerk_user_id: str
    name: str
    emoji: str
    created_at: str


class ProfileSummary(BaseModel):
    id: int
    clerk_user_id: str
    name: str
    emoji: str
    created_at: str
    income: float = 0.0
    expenses: float = 0.0
    balance: float = 0.0


class TagCreate(BaseModel):
    name: str
    color: str


class Tag(BaseModel):
    id: int
    user_id: int
    name: str
    color: str


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    subcategory: str
    date: str
    tag_ids: list[int] = []


class Expense(BaseModel):
    id: int
    user_id: int
    title: str
    amount: float
    category: str
    subcategory: str
    date: str
    created_at: str
    tags: list[Tag] = []
