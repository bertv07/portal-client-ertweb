from app.models.base import Base
from app.models.user import User
from app.models.notification import Notification
from app.models.project import Project
from app.models.invoice import Invoice
from app.models.document import Document
from app.models.maintenance import MaintenancePlan, MaintenancePayment
from app.models.manual_payment import ManualPayment

# This file ensures all models are imported so Alembic can find them
