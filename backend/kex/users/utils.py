# import logging
# from authy.api import AuthyApiClient
# # from config.settings.base import TWILIO
# from django.conf import settings

# logger = logging.getLogger()


# class TwilioHandler:
#     def __init__(self) -> None:
#         # self.api_key = TWILIO["API_KEY"]
#         self.api_key = settings.TWILIO["API_KEY"]
#         self.authy_api = AuthyApiClient(self.api_key)

#     def create_or_get_user(self, email, phone_number):
#         user = self.authy_api.users.create(
#             email=email, phone=str(phone_number), country_code=91
#         )
#         logger.info(f"Response from create user: {user.content}")

#         if user.ok():
#             return user.id
#         else:
#             return user.errors()

#     def send_otp(self, auth_id):
#         sms = self.authy_api.users.request_sms(auth_id)
#         logger.info(f"Response from send otp: {sms.content}")
#         if sms.ok():
#             logger.info(f"Otp has been sent successfully")

#     def verify_otp(self, auth_id, otp):

#         verification = self.authy_api.tokens.verify(auth_id, token=str(otp))
#         logger.info(f"Response from verify otp: {verification.content}")

#         if verification.ok():
#             logger.info(f"Otp has been verified successfully")
#             return True
#         else:
#             return False

#     def get_user_status(self, auth_id):
#         status = self.authy_api.users.status(auth_id)

#         return status.content
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
