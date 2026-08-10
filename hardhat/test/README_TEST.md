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
| Withdraw | Không thể rút khi chưa duyệt hoặc sai ví; beneficiary nhận đúng amount được duyệt, `totalWithdrawn` tăng và request chuyển `Withdrawn`. |
| Nhiều đợt | Sau một lần rút, beneficiary tạo được request tiếp theo trong số dư còn lại. |

Các test event đảm bảo chuỗi bằng chứng `DisbursementRequested` → `DisbursementApproved` → `FundsWithdrawn` được ghi công khai và theo cùng `campaignId`/`requestId`.
