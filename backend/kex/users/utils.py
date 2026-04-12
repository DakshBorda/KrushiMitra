from twilio.rest import Client
from config.settings.base import TWILIO
from twilio.base.exceptions import TwilioRestException
import logging

logger = logging.getLogger(__name__)


class TwilioHandler:
    def __init__(self):
        self.client = Client(
            TWILIO["ACCOUNT_SID"],
            TWILIO["AUTH_TOKEN"]
        )
        self.verify_sid = TWILIO["VERIFY_SID"]

    def send_otp(self, phone_number):
        try:
            verification = self.client.verify.services(
                self.verify_sid
            ).verifications.create(
                to=f"+91{phone_number}",
                channel="sms"
            )
            logger.info(f"OTP sent: {verification.sid}")
            return verification

        except TwilioRestException as e:
            if e.code == 60203:
                return {
                    "status": "blocked",
                    "message": "OTP limit reached. Please wait."
                }
            raise e

    def verify_otp(self, phone_number, otp):
        verification_check = self.client.verify.services(
            self.verify_sid
        ).verification_checks.create(
            to=f"+91{phone_number}",
            code=str(otp)
        )
        return verification_check.status == "approved"
