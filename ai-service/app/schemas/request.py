from pydantic import BaseModel, Field
from typing import Optional, Dict

class UCICreditRequest(BaseModel):
    limit_bal: float = Field(..., description="Amount of given credit in NT dollars")
    sex: int = Field(..., description="Gender (1 = male; 2 = female)")
    education: int = Field(..., description="Education (1 = graduate school; 2 = university; 3 = high school; 4 = others)")
    marriage: int = Field(..., description="Marital status (1 = married; 2 = single; 3 = others)")
    age: int = Field(..., description="Age in years")
    pay_0: int = Field(..., description="Repayment status in September")
    pay_2: int = Field(..., description="Repayment status in August")
    pay_3: int = Field(..., description="Repayment status in July")
    pay_4: int = Field(..., description="Repayment status in June")
    pay_5: int = Field(..., description="Repayment status in May")
    pay_6: int = Field(..., description="Repayment status in April")
    bill_amt1: float = Field(..., description="Amount of bill statement in September")
    bill_amt2: float = Field(..., description="Amount of bill statement in August")
    bill_amt3: float = Field(..., description="Amount of bill statement in July")
    bill_amt4: float = Field(..., description="Amount of bill statement in June")
    bill_amt5: float = Field(..., description="Amount of bill statement in May")
    bill_amt6: float = Field(..., description="Amount of bill statement in April")
    pay_amt1: float = Field(..., description="Amount of previous payment in September")
    pay_amt2: float = Field(..., description="Amount of previous payment in August")
    pay_amt3: float = Field(..., description="Amount of previous payment in July")
    pay_amt4: float = Field(..., description="Amount of previous payment in June")
    pay_amt5: float = Field(..., description="Amount of previous payment in May")
    pay_amt6: float = Field(..., description="Amount of previous payment in April")

class PredictRequestNew(BaseModel):
    userId: str
    loanAmount: float
    tenureMonths: int
    interestRate: float
    emi: float
    features: UCICreditRequest

class ChatRequest(BaseModel):
    userId: str
    message: str
    profile: Optional[Dict] = None
