# Kiểm thử Crowdfunding

Chạy toàn bộ test:

```bash
npm test
```

Fixture dùng năm ví local: tổ chức/creator, beneficiary, donor, verifier và stranger. Verifier được truyền khi tạo campaign, lưu trong campaign và không thể đổi sau đó.

| Nhóm | Nội dung được kiểm thử |
| --- | --- |
| Campaign | Verifier không được rỗng và phải độc lập với beneficiary/tổ chức; tạo campaign lưu đúng verifier; hai campaign có thể dùng hai verifier khác nhau; chặn beneficiary rỗng, target 0, deadline quá khứ. |
| Donation & tổ chức | Donor đóng góp thành công; chặn donation 0, campaign đóng/hết hạn; chỉ creator được đóng campaign. |
| Request | Chỉ beneficiary tạo request; bắt buộc `amount > 0`, `evidenceHash` khác 0 và amount không vượt số dư chưa giải ngân; chỉ một request đang xử lý. |
| Verifier | Chỉ ví verifier của campaign có thể duyệt request `Pending`; không thể duyệt lại request đã duyệt. |
| Từ chối/hủy | Verifier có thể từ chối request `Pending`; beneficiary có thể hủy request `Pending`; cả hai giải phóng campaign để tạo request mới. |
| Withdraw | Không thể rút khi chưa duyệt, sai ví hoặc rút lần hai; beneficiary nhận đúng amount được duyệt, `totalWithdrawn` tăng và request chuyển `Withdrawn`. |
| Nhiều đợt | Sau một lần rút, beneficiary tạo được request tiếp theo trong số dư còn lại. |
| Security | Reentrancy callback bị chặn; nếu beneficiary từ chối ETH thì toàn bộ withdraw rollback và request vẫn `Approved`; mọi luồng donate/withdraw kiểm tra `totalWithdrawn <= totalRaised`. |

Các test event đảm bảo mọi nhánh đều có dấu vết công khai theo cùng `campaignId`/`requestId`: `DisbursementRequested` → `DisbursementApproved` → `FundsWithdrawn`, hoặc `DisbursementRejected`, hoặc `DisbursementCancelled`.
