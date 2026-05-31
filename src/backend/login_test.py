# -*- coding: utf-8 -*-
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from login import login_user

print("[*] 正在执行登录接口单元测试...")
res = login_user("admin", "secret")
# 期待登录成功
assert res["success"] == True, "期待登录成功，但返回失败！"
print("[+] 测试通过！")
