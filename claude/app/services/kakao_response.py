from typing import Optional


def simple_text(text: str, quick_replies: Optional[list] = None) -> dict:
    """Build Kakao skill v2.0 response with simpleText."""
    response = {
        "version": "2.0",
        "template": {
            "outputs": [
                {"simpleText": {"text": text}}
            ]
        }
    }
    if quick_replies:
        response["template"]["quickReplies"] = quick_replies
    return response


def quick_reply(label: str, message_text: str) -> dict:
    """Build a quickReply item."""
    return {
        "label": label,
        "messageText": message_text,
        "action": "message"
    }
