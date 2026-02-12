"""跟踪评估脚本（MOTA, IDF1, HOTA）"""
from __future__ import annotations


def evaluate_mot(gt_file: str, pred_file: str):
    """评估多目标跟踪性能
    Args:
        gt_file: Ground truth 文件路径 (MOTChallenge 格式)
        pred_file: 预测结果文件路径
    """
    # TODO: 集成 motmetrics / TrackEval 库进行评估
    # pip install motmetrics
    print(f"[Evaluate] GT: {gt_file}")
    print(f"[Evaluate] Pred: {pred_file}")
    print("[Evaluate] TODO: Integrate motmetrics for MOTA/IDF1/HOTA evaluation")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python evaluate.py <gt_file> <pred_file>")
        sys.exit(1)
    evaluate_mot(sys.argv[1], sys.argv[2])
