# -*- coding: utf-8 -*-
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from login import login_user

print("[*] 正在执行登录接口单元测试...")
res = login_user("admin", "secret")
# 故意创造一个测试断言错误：期待登录失败（但实际应该成功）
assert res["success"] == False, "期待登录失败，但返回成功！（故意构造的错误）"
print("[+] 测试通过！")
