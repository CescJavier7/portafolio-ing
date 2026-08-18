import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ManualPaymentCreate(BaseModel):
    plan: str = Field(pattern="^(PRO|TEAM)$")
    method: str = Field(max_length=30)
    # Referencia/nº de transacción que el usuario copia de su comprobante.
    reference: str = Field(min_length=2, max_length=200)
    note: str = Field(default="", max_length=500)


class PaymentRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    plan: str
    method: str
    reference: str
    note: str
    amount: str
    status: str
    created_at: datetime
    reviewed_at: datetime | None = None


class PendingPaymentOut(BaseModel):
    # Vista del fundador: incluye de quién es la solicitud.
    id: uuid.UUID
    plan: str
    method: str
    reference: str
    note: str
    amount: str
    status: str
    created_at: datetime
    organization_id: uuid.UUID
    organization_name: str
    user_email: str


class PayMethodOut(BaseModel):
    key: str
    label: str
    instructions: str
    # URL de imagen opcional (p. ej. el QR de De Una) para mostrar en el modal.
    image: str | None = None
    # Enlace de pago opcional (p. ej. link de PayPhone/PayPal): el modal lo
    # muestra como botón "Pagar" que abre el checkout hospedado del proveedor.
    url: str | None = None


class ManualConfigOut(BaseModel):
    price_pro: str
    price_team: str
    contact: str
    methods: list[PayMethodOut]
