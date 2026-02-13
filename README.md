# UAV Detection System — 无人机智能巡检系统

## 1. 项目概述

本项目旨在构建一套**基于无人机的智能巡检系统**，以 **目标检测**、**目标跟踪**、**路径规划** 三大核心算法模块为驱动，实现无人机对巡检区域的自主飞行、实时感知与智能决策。系统适用于电力线路巡检、光伏电站巡检、建筑工地监控、农业植保监测、安防巡逻等场景。

### 1.1 核心能力

| 核心模块 | 能力描述 |
|---------|---------|
| **目标检测** | 基于深度学习模型（YOLOv8/v11）对视频流/图像进行实时目标检测与缺陷识别 |
| **目标跟踪** | 基于 DeepSORT/ByteTrack 等算法对检测目标进行多目标持续跟踪，维护目标 ID 与轨迹 |
| **路径规划** | 基于 A*/RRT/改进蚁群等算法，结合地图与障碍物信息，自动规划最优巡检航线 |

### 1.2 设计目标

- **实时性**：端到端检测+跟踪延迟 < 100ms（GPU 推理）
- **准确性**：目标检测 mAP@0.5 ≥ 0.85，跟踪 MOTA ≥ 0.75
- **自主性**：路径规划支持动态避障与航线重规划
- **可扩展**：模块化架构，支持模型热替换与算法插件化

---

## 2. 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                     前端可视化 (Web)                          │
│          React + TypeScript + TailwindCSS + Leaflet          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐  │
│  │ 实时监控   │  │ 路径规划   │  │ 检测结果   │  │ 数据统计  │  │
│  │ 视频+地图  │  │ 航线编辑   │  │ 跟踪回放   │  │ 报告导出  │  │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API / WebSocket
┌──────────────────────────┴───────────────────────────────────┐
│                      后端服务 (FastAPI)                       │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │ 任务管理  │  │ 设备管理   │  │ 数据存储   │  │ 用户认证   │  │
│  └──────────┘  └───────────┘  └───────────┘  └───────────┘  │
└───────┬──────────────┬───────────────┬───────────────────────┘
        │              │               │
┌───────┴───────┐ ┌────┴────────┐ ┌────┴──────────┐
│  目标检测服务  │ │ 目标跟踪服务 │ │  路径规划服务  │
│  YOLOv8/v11  │ │ DeepSORT    │ │  A* / RRT*    │
│  PyTorch     │ │ ByteTrack   │ │  蚁群 / D*    │
│  TensorRT    │ │ BoT-SORT    │ │  动态避障      │
└───────────────┘ └─────────────┘ └───────────────┘
        │              │               │
┌───────┴──────────────┴───────────────┴───────────────────────┐
│                     基础设施层                                │
│  PostgreSQL │ Redis │ MinIO │ Docker │ MAVLink/MAVSDK        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **前端** | React 18 + TypeScript + Vite | SPA 单页应用 |
| **UI** | TailwindCSS + shadcn/ui | 现代化 UI 组件 |
| **地图** | Leaflet / Cesium | 2D/3D 地图、航线可视化、轨迹回放 |
| **视频流** | WebRTC / HLS | 实时视频传输与回放 |
| **后端** | FastAPI (Python 3.11+) | 高性能异步 API |
| **目标检测** | YOLOv8/v11 + Ultralytics | 实时目标检测与缺陷识别 |
| **目标跟踪** | DeepSORT / ByteTrack / BoT-SORT | 多目标跟踪（MOT） |
| **路径规划** | A* / RRT* / 改进蚁群算法 | 全局+局部路径规划 |
| **推理加速** | TensorRT / ONNX Runtime | GPU 推理加速 |
| **飞控通信** | MAVLink + MAVSDK-Python | 无人机指令收发与遥测 |
| **数据库** | PostgreSQL 15 | 结构化数据存储 |
| **缓存** | Redis 7 | 实时状态缓存与消息队列 |
| **对象存储** | MinIO | 图片/视频/模型文件存储 |
| **容器化** | Docker + Docker Compose | 开发与部署环境一致性 |

---

## 4. 核心功能模块

### 4.1 目标检测模块

基于深度学习的实时目标检测，是整个系统的感知基础。

| 功能 | 描述 |
|------|------|
| 实时检测 | 对无人机视频流逐帧运行 YOLOv8/v11，输出目标类别、置信度、边界框 |
| 多类别支持 | 支持自定义检测类别（如行人、车辆、设备缺陷、异物等） |
| 模型管理 | 模型版本管理、权重热加载、A/B 测试 |
| 推理加速 | 支持 TensorRT/ONNX 导出，FP16/INT8 量化加速 |
| 边缘部署 | 支持在 Jetson 等边缘设备上运行轻量化模型 |
| 结果可视化 | 检测框、类别标签、置信度实时叠加在视频画面上 |

**算法流程：**

```
输入帧 → 图像预处理(Resize/Normalize) → YOLOv8 推理 → NMS后处理 → 检测结果
                                                                      ↓
                                                              [cls, conf, bbox]
```

### 4.2 目标跟踪模块

在检测结果基础上，对目标进行跨帧关联与持续跟踪，维护目标身份与运动轨迹。

| 功能 | 描述 |
|------|------|
| 多目标跟踪 | 基于 DeepSORT/ByteTrack 实现多目标实时跟踪 |
| ID 分配与维护 | 为每个目标分配唯一 ID，处理遮挡、重入场景 |
| 轨迹记录 | 记录每个目标的历史轨迹（位置、时间戳、速度） |
| Re-ID 特征 | 基于外观特征（ReID 网络）提升遮挡后重识别能力 |
| 轨迹预测 | 基于卡尔曼滤波/运动模型预测目标下一帧位置 |
| 轨迹回放 | 在地图/视频上回放目标历史运动轨迹 |

**算法流程：**

```
检测结果 [cls, conf, bbox]
        ↓
外观特征提取 (ReID CNN)  +  运动预测 (Kalman Filter)
        ↓                        ↓
        └──── 匈牙利匹配 / IoU 关联 ────┘
                      ↓
              轨迹更新 / 新建 / 删除
                      ↓
              输出: [track_id, cls, bbox, trajectory]
```

### 4.3 路径规划模块

为无人机生成最优巡检航线，支持静态全局规划与动态局部避障。

| 功能 | 描述 |
|------|------|
| 全局路径规划 | 基于 A*/Dijkstra 在栅格地图上规划全局最优路径 |
| 采样式规划 | 基于 RRT*/PRM 在连续空间中规划无碰撞路径 |
| 智能优化 | 基于改进蚁群/遗传算法优化多航点巡检顺序（TSP） |
| 动态避障 | 结合实时检测结果，D* Lite 算法动态重规划 |
| 区域覆盖 | 基于 Boustrophedon/螺旋式分解实现区域全覆盖规划 |
| 约束处理 | 考虑电量、禁飞区、最大飞行距离等约束条件 |
| 3D 规划 | 支持三维空间路径规划（含高度层） |

**算法流程：**

```
巡检区域 + 障碍物地图 + 约束条件
              ↓
    ┌─────────┴─────────┐
    │  全局规划层         │
    │  A* / RRT* / ACO  │
    └─────────┬─────────┘
              ↓
    ┌─────────┴─────────┐
    │  局部规划层         │
    │  D* Lite / DWA    │
    │  (动态避障)        │
    └─────────┬─────────┘
              ↓
    航点序列 [(x,y,z,heading), ...]
              ↓
    MAVLink → 无人机执行
```

---

## 5. 辅助功能模块

### 5.1 实时监控

- 无人机视频流实时显示（叠加检测框+跟踪 ID）
- 地图上实时显示无人机位置、规划航线、目标轨迹
- 遥测数据面板（电量、高度、速度、GPS、信号强度）

### 5.2 任务管理

- 创建巡检任务（关联区域、检测模型、规划算法）
- 定时/周期性任务调度
- 任务执行状态实时监控与历史查询

### 5.3 数据管理与报告

- 检测/跟踪结果自动归档（图片、视频、JSON）
- 统计分析仪表盘（检测数量、类别分布、轨迹热力图）
- 自动生成巡检报告（PDF/Excel）

### 5.4 系统管理

- 用户角色权限（管理员/操作员/查看者）
- 无人机设备注册与状态管理
- 系统日志与告警通知

---

## 6. 项目目录结构

```
UAVDetectionSystem/
│
├── frontend/                      # 前端项目
│   ├── src/
│   │   ├── components/            # 通用 UI 组件
│   │   ├── pages/
│   │   │   ├── Dashboard/         # 总览仪表盘
│   │   │   ├── Monitor/           # 实时监控（视频+地图+遥测）
│   │   │   ├── PathPlanning/      # 路径规划与航线编辑
│   │   │   ├── Detection/         # 检测结果查看
│   │   │   ├── Tracking/          # 跟踪轨迹回放
│   │   │   ├── Mission/           # 任务管理
│   │   │   └── Settings/          # 系统设置
│   │   ├── services/              # API 调用封装
│   │   ├── stores/                # 状态管理 (Zustand)
│   │   └── utils/                 # 工具函数
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                       # 后端 API 服务
│   ├── app/
│   │   ├── api/                   # API 路由
│   │   │   ├── auth.py            # 认证接口
│   │   │   ├── missions.py        # 任务接口
│   │   │   ├── devices.py         # 设备接口
│   │   │   ├── detections.py      # 检测结果接口
│   │   │   ├── tracking.py        # 跟踪结果接口
│   │   │   └── planning.py        # 路径规划接口
│   │   ├── core/                  # 核心配置
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/                # ORM 数据模型
│   │   ├── schemas/               # Pydantic 校验
│   │   ├── services/              # 业务逻辑
│   │   └── main.py                # FastAPI 入口
│   ├── requirements.txt
│   └── Dockerfile
│
├── detection/                     # 目标检测模块
│   ├── models/                    # 模型权重 (.pt / .onnx / .engine)
│   ├── configs/                   # 模型配置与超参数
│   ├── detector.py                # 检测器统一接口
│   ├── preprocessor.py            # 图像预处理
│   ├── postprocessor.py           # NMS 后处理
│   ├── export.py                  # 模型导出 (ONNX/TensorRT)
│   ├── train.py                   # 训练脚本
│   ├── evaluate.py                # 评估脚本 (mAP/Precision/Recall)
│   ├── dataset.py                 # 数据集加载与增强
│   ├── requirements.txt
│   └── Dockerfile
│
├── tracking/                      # 目标跟踪模块
│   ├── trackers/
│   │   ├── deep_sort.py           # DeepSORT 跟踪器
│   │   ├── byte_track.py          # ByteTrack 跟踪器
│   │   └── bot_sort.py            # BoT-SORT 跟踪器
│   ├── reid/                      # ReID 外观特征模型
│   │   ├── model.py
│   │   └── weights/
│   ├── motion/                    # 运动模型
│   │   ├── kalman_filter.py       # 卡尔曼滤波
│   │   └── predictor.py           # 轨迹预测
│   ├── tracker_manager.py         # 跟踪器统一管理接口
│   ├── evaluate.py                # 评估脚本 (MOTA/IDF1/HOTA)
│   ├── requirements.txt
│   └── Dockerfile
│
├── path_planning/                 # 路径规划模块
│   ├── algorithms/
│   │   ├── a_star.py              # A* 算法
│   │   ├── rrt_star.py            # RRT* 算法
│   │   ├── ant_colony.py          # 改进蚁群算法
│   │   ├── d_star_lite.py         # D* Lite 动态重规划
│   │   └── coverage.py            # 区域覆盖规划
│   ├── map_manager.py             # 地图与障碍物管理
│   ├── constraint.py              # 约束条件处理
│   ├── planner.py                 # 规划器统一接口
│   ├── evaluate.py                # 评估脚本 (路径长度/平滑度/覆盖率)
│   ├── visualizer.py              # 路径可视化工具
│   ├── requirements.txt
│   └── Dockerfile
│
├── flight_control/                # 飞控通信模块
│   ├── mavlink_client.py          # MAVLink 通信
│   ├── mission_executor.py        # 航线执行器
│   ├── telemetry.py               # 遥测数据采集
│   └── safety.py                  # 安全策略（地理围栏、电量保护）
│
├── docker-compose.yml             # 容器编排
├── .env.example                   # 环境变量模板
├── docs/                          # 项目文档
│   ├── api.md                     # API 文档
│   ├── detection.md               # 目标检测模块文档
│   ├── tracking.md                # 目标跟踪模块文档
│   ├── path_planning.md           # 路径规划模块文档
│   ├── deployment.md              # 部署指南
│   └── architecture.md            # 架构设计文档
└── README.md                      # 本文件
```

---

## 7. 实施计划

### 第一阶段：基础框架与环境搭建 ✅

- [x] 项目初始化与目录结构搭建
- [x] 前端脚手架搭建（React + Vite + TailwindCSS + Leaflet）
- [x] 后端 FastAPI 项目初始化，数据库模型设计
- [x] Docker Compose 开发环境（PostgreSQL + Redis + MinIO）
- [x] 目标检测 / 目标跟踪 / 路径规划 / 飞控通信 核心模块框架

### 第二阶段：前后端完整功能开发 ✅

- [x] Leaflet 地图组件 + Dashboard/Monitor/PathPlanning 完整 UI
- [x] 后端 API 完整业务逻辑（CRUD + 文件上传 + 路径生成）
- [x] WebSocket 实时通信（遥测/检测/仪表盘/心跳）
- [x] 前端对接后端 API + WebSocket 实时数据
- [x] 所有页面（Dashboard/Monitor/Detection/Tracking/Mission/PathPlanning）连接后端

### 第三阶段：认证与质量保障 ✅

- [x] 登录/注册页面 + JWT 认证
- [x] 路由守卫（AuthGuard）+ 401 自动跳转
- [x] 系统设置页面对接后端持久化
- [x] 后端单元测试（pytest-asyncio，覆盖 auth/missions/planning）
- [x] 前端 ErrorBoundary 错误边界
- [x] bcrypt 兼容性修复

### 第四阶段：工程化完善 ✅

- [x] Alembic 数据库迁移配置
- [x] 404 页面 + 加载状态组件
- [x] API 响应拦截器（401 自动跳转登录）
- [x] README 文档更新

### 后续规划

- [ ] 数据集采集与 YOLOv8/v11 模型训练
- [ ] DeepSORT / ByteTrack 跟踪器实际集成
- [ ] TensorRT / ONNX 推理加速
- [ ] 飞控通信集成（MAVLink 航线下发与遥测）
- [ ] 仿真环境测试（AirSim / Gazebo）
- [ ] CI/CD 流水线搭建
- [ ] 生产环境部署

---

## 8. 评估指标

### 目标检测

| 指标 | 目标值 | 说明 |
|------|-------|------|
| mAP@0.5 | ≥ 0.85 | COCO 评估标准 |
| mAP@0.5:0.95 | ≥ 0.60 | 严格评估标准 |
| 推理速度 | ≥ 30 FPS | RTX 3060，输入 640×640 |
| 推理速度（边缘） | ≥ 15 FPS | Jetson Orin Nano |

### 目标跟踪

| 指标 | 目标值 | 说明 |
|------|-------|------|
| MOTA | ≥ 0.75 | 多目标跟踪准确度 |
| IDF1 | ≥ 0.70 | ID 关联 F1 分数 |
| HOTA | ≥ 0.60 | 综合跟踪评估 |
| ID Switch | ≤ 50/1000帧 | ID 切换次数 |

### 路径规划

| 指标 | 目标值 | 说明 |
|------|-------|------|
| 路径最优比 | ≤ 1.2× 最短路径 | 与理论最优路径的比值 |
| 规划耗时 | < 2s | 100×100 栅格地图 |
| 覆盖率 | ≥ 95% | 区域覆盖规划 |
| 动态重规划 | < 500ms | 新障碍物出现后重规划时间 |

---

## 9. 环境要求

### 开发环境

| 依赖 | 版本要求 |
|------|---------|
| Python | >= 3.11 |
| Node.js | >= 18 LTS |
| PyTorch | >= 2.0 |
| Ultralytics | >= 8.0 |
| PostgreSQL | >= 15 |
| Redis | >= 7 |
| Docker | >= 24 |
| CUDA | >= 11.8 |

### 硬件建议

| 组件 | 推荐配置 |
|------|---------|
| 开发机 GPU | NVIDIA RTX 3060 及以上 |
| 边缘设备 | NVIDIA Jetson Orin Nano / Xavier NX |
| 无人机 | DJI Matrice 系列 / PX4 开源飞控 |
| 摄像头 | 4K 可见光 + 红外热成像（可选） |

---

## 10. 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/at15535377922-stack/UAVDetectionSystem.git
cd UAVDetectionSystem

# 2. 复制环境变量
cp .env.example .env

# 3. 后端启动（开发模式，使用 SQLite）
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 4. 前端启动（新终端）
cd frontend
npm install
npm run dev

# 5. 访问系统
# 前端: http://localhost:3000
# API 文档: http://localhost:8000/docs
# 首次使用请先注册账户

# 6. 运行后端测试
cd backend
pytest tests/ -v

# 7. 数据库迁移（可选，生产环境）
cd backend
alembic revision --autogenerate -m "init"
alembic upgrade head

# 8. Docker Compose 启动完整服务（可选）
docker-compose up -d
```

---

## 11. 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 12. 联系方式

如有问题或建议，请通过 [Issues](https://github.com/at15535377922-stack/UAVDetectionSystem/issues) 提交。
