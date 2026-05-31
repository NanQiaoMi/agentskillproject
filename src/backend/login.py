# -*- coding: utf-8 -*-
def login_user(username, password):
    if username == "admin" and password == "secret":
        return {"success": True, "token": "mock-token"}
    return {"success": False, "message": "用户名或密码错误"}
