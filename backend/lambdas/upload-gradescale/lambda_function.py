"""
POST /gradescales
Body JSON: {
  instituteId, name, country, foreignKind,
  scale: { foreignGrade: usLetter, ... }
}
"""

import json
import time
import boto3

TABLE_GRADESCALE = "gradescales"
ddb = boto3.resource("dynamodb")
table = ddb.Table(TABLE_GRADESCALE)


def _resp(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=str),
    }


def lambda_handler(event, _context):
    try:
        raw = event.get("body") or "{}"
        body = json.loads(raw) if isinstance(raw, str) else raw

        institute_id = (body.get("instituteId") or "").strip()
        if not institute_id:
            return _resp(400, {"error": "instituteId is required"})

        scale = body.get("scale")
        if not isinstance(scale, dict):
            scale = {}

        item = {
            "instituteId": institute_id,
            "name": body.get("name") or "",
            "country": body.get("country") or "",
            "foreignKind": body.get("foreignKind") or "letter",
            "scale": scale,
            "updatedAt": int(time.time() * 1000),
        }

        table.put_item(Item=item)
        return _resp(200, {"ok": True, "item": item})
    except Exception as e:
        print(f"error: {e}")
        return _resp(500, {"error": str(e)})
