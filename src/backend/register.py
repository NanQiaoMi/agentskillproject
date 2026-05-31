# -*- coding: utf-8 -*-
def register_user(username, password):
    if not username or not password:
        return {"success": False, "message": "用户名和密码不能为空"}
    return {"success": True, "message": "注册成功"}
