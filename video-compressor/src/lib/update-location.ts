export interface UpdateLocation {blocked:boolean;kind:'ready'|'disk-image'|'translocation'|'read-only';path:string}
export function relocationError(error:unknown){return /read.only file system|os error 30|AppTranslocation/i.test(String(error))}
export const relocationMessage='当前轻影从只读安装镜像或临时隔离位置运行，无法原地更新。请将轻影.app 拖入“应用程序”，退出当前轻影，再从“应用程序”重新打开。无需重新下载安装包。'
export function installFailureMessage(error:unknown){const detail=String(error);return /permission denied|os error 13|operation not permitted/i.test(detail)?`安装被权限阻止。请允许系统授权，或使用有写入权限的应用安装位置。更新包已保留，可以重试安装。${detail}`:`安装暂未完成，更新包已保留，可以重试安装。${detail}`}
