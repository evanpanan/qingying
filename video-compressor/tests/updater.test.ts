import test from 'node:test'
import assert from 'node:assert/strict'
import {manifest} from '../scripts/build-update.mjs'
test('更新清单绑定版本、平台及固定发布地址，缺少签名不能发布',()=>{
 const value=manifest('1.7.0','dGVzdA==','2026-11-27T00:00:00Z')
 assert.equal(value.version,'1.7.0');assert.equal(value.pub_date,'2026-11-27T00:00:00Z');assert.equal(value.platforms['darwin-aarch64'].url,'https://github.com/evanpanan/qingying/releases/download/v1.7.0/LightVid_1.7.0_aarch64.app.tar.gz');assert.equal(value.platforms['darwin-aarch64'].signature,'dGVzdA==');assert.throws(()=>manifest('1.7.0',''));assert.throws(()=>manifest('../../arbitrary','dGVzdA=='))
})

import {relocationError,installFailureMessage} from '../src/lib/update-location'
test('只读镜像与权限问题分别提示，失败后不会误导为重新下载',()=>{
 assert(relocationError('Read-only file system (os error 30) at path /Volumes/轻影 1.7.0'))
 assert(relocationError('AppTranslocation/uuid/d/轻影.app'))
 assert(!relocationError('Permission denied (os error 13)'))
 assert.match(installFailureMessage('Permission denied (os error 13)'),/权限阻止.*更新包已保留.*重试安装/)
 assert(!installFailureMessage('Permission denied').includes('重新下载'))
 assert.match(installFailureMessage('out of disk space'),/更新包已保留/)
})
