import logging

logger = logging.getLogger()


def response_payload(success: bool, data=None, msg=None, errors=None):
    if success:
        return {"success": True, "message": msg, "data": data}
    out = {"success": False, "message": msg}
    if errors is not None:
        out["errors"] = errors
    return out
