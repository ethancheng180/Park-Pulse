"""Stripe payment integration for marketplace."""
import stripe
from decimal import Decimal
from typing import Optional
from sqlalchemy.orm import Session
from .config import get_settings
from .models import User, Match, Payout
from datetime import datetime

settings = get_settings()

# Initialize Stripe
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key


def create_payment_intent(
    amount: Decimal,
    customer_id: Optional[str] = None,
    metadata: Optional[dict] = None
) -> dict:
    """
    Create a Stripe PaymentIntent for driver payment.
    
    Args:
        amount: Amount in dollars
        customer_id: Stripe customer ID (optional)
        metadata: Additional metadata to attach
    
    Returns:
        PaymentIntent object as dict
    """
    if not settings.stripe_secret_key:
        # Mock mode for development without Stripe
        return {
            "id": "pi_mock_" + str(datetime.utcnow().timestamp()),
            "client_secret": "pi_mock_secret_123",
            "status": "requires_payment_method"
        }
    
    amount_cents = int(amount * 100)  # Convert to cents
    
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        customer=customer_id,
        metadata=metadata or {},
        capture_method="manual"  # Hold funds until verification
    )
    
    return intent


def capture_payment(payment_intent_id: str) -> dict:
    """
    Capture a held payment after successful verification.
    """
    if not settings.stripe_secret_key:
        return {"id": payment_intent_id, "status": "succeeded"}
    
    intent = stripe.PaymentIntent.capture(payment_intent_id)
    return intent


def refund_payment(payment_intent_id: str, reason: str = "requested_by_customer") -> dict:
    """
    Refund a payment after failed verification or admin action.
    """
    if not settings.stripe_secret_key:
        return {"id": "re_mock_123", "status": "succeeded"}
    
    # Get the payment intent to find the charge
    intent = stripe.PaymentIntent.retrieve(payment_intent_id)
    
    if intent.status == "requires_capture":
        # Cancel uncaptured payment
        canceled = stripe.PaymentIntent.cancel(payment_intent_id)
        return canceled
    
    # Refund captured payment
    refund = stripe.Refund.create(
        payment_intent=payment_intent_id,
        reason=reason
    )
    return refund


def create_payout_to_pulser(
    db: Session,
    match: Match,
    pulser: User
) -> Payout:
    """
    Create a payout to the pulser after successful verification.
    
    Splits payment: 80% to pulser, 20% platform fee.
    """
    # Calculate split
    total_amount = match.amount
    platform_fee = total_amount * Decimal(settings.platform_fee_percent) / Decimal("100")
    pulser_amount = total_amount - platform_fee
    
    # Create payout record
    payout = Payout(
        match_id=match.id,
        pulser_id=pulser.id,
        amount=pulser_amount,
        platform_fee=platform_fee,
        status='pending'
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    
    # Update pulser balance
    pulser.balance += pulser_amount
    db.commit()
    
    # Perform actual Stripe transfer (if Connect is set up)
    if settings.stripe_secret_key and pulser.stripe_account_id:
        try:
            transfer = stripe.Transfer.create(
                amount=int(pulser_amount * 100),  # Convert to cents
                currency="usd",
                destination=pulser.stripe_account_id,
                metadata={
                    "match_id": match.id,
                    "payout_id": payout.id
                }
            )
            payout.stripe_transfer_id = transfer.id
            payout.status = 'completed'
            payout.completed_at = datetime.utcnow()
            db.commit()
        except stripe.error.StripeError as e:
            payout.status = 'failed'
            db.commit()
            raise e
    else:
        # Mock mode - mark as completed
        payout.status = 'completed'
        payout.completed_at = datetime.utcnow()
        db.commit()
    
    return payout


def ensure_stripe_customer(db: Session, user: User) -> str:
    """
    Ensure user has a Stripe customer ID.
    Create one if it doesn't exist.
    """
    if user.stripe_customer_id:
        return user.stripe_customer_id
    
    if not settings.stripe_secret_key:
        # Mock mode
        customer_id = f"cus_mock_{user.id}"
        user.stripe_customer_id = customer_id
        db.commit()
        return customer_id
    
    customer = stripe.Customer.create(
        email=user.email,
        metadata={"user_id": user.id}
    )
    
    user.stripe_customer_id = customer.id
    db.commit()
    
    return customer.id
