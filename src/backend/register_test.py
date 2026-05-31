# -*- coding: utf-8 -*-
import sys
import os

# 将 src/backend 放入 path 以便加载
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from register import register_user

print("[*] 正在执行注册接口单元测试...")
res = register_user("test_user", "password123")
# 故意创造一个测试断言错误：期待注册失败（但实际应该成功）
assert res["success"] == False, "期待注册失败，但返回成功！（故意构造的错误）"
print("[+] 测试通过！")
