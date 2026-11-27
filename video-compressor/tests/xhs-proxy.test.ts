import assert from 'node:assert/strict'
import test from 'node:test'
import {mediaReferer} from '../api/proxy.ts'
test('小红书 CDN 发送固定来源，重定向到其他主机不泄露来源', () => {
  assert.equal(mediaReferer('sns-video-bd.xhscdn.com'),'https://www.xiaohongshu.com/')
  assert.equal(mediaReferer('sns-video-hw.xhscdn.com'),'https://www.xiaohongshu.com/')
  assert.equal(mediaReferer('xhscdn.com.attacker.example'),undefined)
  assert.equal(mediaReferer('other.example'),undefined)
  assert.equal(mediaReferer('v.douyinvod.com'),'https://www.douyin.com/')
})
