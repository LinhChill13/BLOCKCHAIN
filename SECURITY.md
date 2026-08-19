# Chính sách bảo mật

## Phạm vi và báo cáo lỗ hổng

Tài liệu này áp dụng cho smart contract, frontend và luồng upload chứng từ IPFS của CrowdfundChain. Không đăng secret, private key, JWT, URL có token hoặc dữ liệu cá nhân trong issue công khai. Với lỗ hổng có thể gây mất tiền, lộ chứng từ hoặc vượt qua kiểm soát upload, hãy báo riêng cho maintainer/repository owner và kèm phiên bản, các bước tái hiện tối thiểu cùng mức độ ảnh hưởng. Không khai thác trên mainnet/Sepolia ngoài mức cần thiết để chứng minh lỗi.

## Quản lý secret

- Không commit `frontend/.env.local`, `hardhat/.env`, các file `.env.*` (trừ `.env.example`), JWT Pinata, token Upstash, private key hoặc seed phrase. Các `.gitignore` của `frontend` và `hardhat` đã loại trừ các file env này, nhưng luôn kiểm tra `git status` và nội dung diff trước khi commit.
- Không đặt `PINATA_JWT`, `UPSTASH_REDIS_REST_TOKEN` hoặc private key trong biến `NEXT_PUBLIC_*`, mã client, log, ảnh chụp màn hình hoặc ticket. Chỉ cấu hình chúng ở server/secret store của môi trường triển khai.
- Chỉ cấp Pinata JWT quyền tối thiểu cần cho upload public files. JWT dùng để ký URL upload chỉ nằm trong API server; trình duyệt chỉ nhận URL ngắn hạn, không nhận JWT.
- Chứng từ IPFS public có thể được đọc bởi bất kỳ ai biết CID. Loại bỏ hoặc che dữ liệu cá nhân trước khi upload; không xem IPFS là nơi lưu dữ liệu mật.

### JWT Pinata bị lộ

1. Thu hồi/revoke JWT bị lộ ngay trong Pinata Dashboard. Đừng chờ kết thúc điều tra mới thu hồi.
2. Tạo JWT mới với quyền tối thiểu tương đương, cập nhật `PINATA_JWT` trong secret store hoặc `frontend/.env.local`, rồi redeploy/restart frontend để API dùng giá trị mới.
3. Kiểm tra log Pinata và log API trong khoảng thời gian từ lúc secret được tạo/lần cuối còn an toàn đến lúc thu hồi; ghi nhận các URL upload hay file bất thường. Các signed URL đã phát hành có thời hạn rất ngắn (hiện là 60 giây), nhưng không được coi là bằng chứng JWT chưa bị lạm dụng.
4. Nếu JWT từng xuất hiện trong Git, CI log, issue hoặc chat, coi nó là đã lộ: xóa/restrict quyền truy cập nơi công khai khi có thể, nhưng vẫn phải revoke và thay JWT. Không chỉ xóa dòng khỏi commit mới nhất.
5. Kiểm tra và rotate `UPSTASH_REDIS_REST_TOKEN` nếu nó cùng bị lộ; việc này tránh kẻ xấu đọc/xóa nonce chống replay hoặc né rate limit. Xác nhận lại API upload hoạt động sau khi đổi cả các secret liên quan.

## Recovery và rotation tài khoản ví

Mỗi campaign lưu cố định `creator`, `beneficiary` và `verifier`; contract hiện không có hàm đổi các địa chỉ này hay hoàn tiền donor. Vì vậy recovery phải ưu tiên **trước khi** verifier duyệt request, và rotation role cần được xử lý bằng campaign mới khi cần thiết.

1. Nếu nghi ví bị lộ, dừng ký giao dịch từ ví đó, bảo vệ seed phrase/hardware wallet, và ghi lại địa chỉ, campaign ID, request ID, transaction hash và thời điểm phát hiện.
2. Kiểm tra trạng thái on-chain của campaign và request. Không dựa chỉ vào giao diện hoặc thông báo ngoài chuỗi.
3. Nếu request còn `Pending`, beneficiary có thể gọi `cancelDisbursement`; verifier hợp lệ có thể gọi `rejectDisbursement`. Chọn thao tác phù hợp trước khi bất kỳ khoản nào được duyệt.
4. Creator có thể gọi `closeCampaign` để chặn **đóng góp mới**. Thao tác này không đổi các role, không hủy request đã tạo và không thu hồi ETH đã nằm trong contract.
5. Tạo ví mới và, sau khi thông báo công khai minh bạch, tạo campaign mới với beneficiary/verifier mới nếu cần rotation. Không công bố private key/seed phrase để “chuyển quyền”.

Các tình huống cần lưu ý:

- **Beneficiary bị lộ hoặc mất quyền truy cập:** không duyệt request pending; cancel/reject request nếu role hợp lệ còn kiểm soát. Beneficiary của campaign cũ không thể thay đổi, nên cần campaign mới cho hoạt động tiếp theo. Số ETH còn trong campaign cũ không có cơ chế chuyển sang ví mới hoặc refund tự động.
- **Verifier bị lộ hoặc không còn độc lập:** beneficiary nên cancel request pending; creator có thể đóng campaign để ngừng nhận đóng góp. Verifier không thể rotate trong campaign cũ, nên không tạo request mới và không dựa vào các approval từ ví nghi bị lộ; dùng campaign mới với verifier khác.
- **Creator bị lộ:** creator chỉ có quyền đóng campaign sớm, nhưng không thể đổi beneficiary/verifier hay rút quỹ. Các bên vẫn phải theo dõi request pending và chuyển sang campaign mới nếu cần. Donor không có hàm refund trong contract hiện tại.

Nếu request đã `Approved` hoặc `Withdrawn`, contract không có chức năng đảo ngược. Lưu toàn bộ bằng chứng và transaction hash, thông báo cho các bên liên quan, và xin tư vấn pháp lý/cơ quan có thẩm quyền khi phù hợp.

## Quy trình verifier kiểm tra chứng từ và xử lý tranh chấp

Verifier chỉ duyệt khi ví đang kết nối đúng địa chỉ `verifier` đã lưu của campaign. Mọi kiểm tra phải hoàn tất **trước** `approveDisbursement`, vì approval có thể dẫn tới beneficiary rút tiền ngay sau đó.

1. Đọc `campaignId`, `requestId`, `amount`, `evidenceCid`, `evidenceHash` trực tiếp từ contract trên Sepolia. Xác minh `keccak256(bytes(evidenceCid))` đúng bằng `evidenceHash`, request đang `Pending`, và amount không vượt nhu cầu/tài liệu đã kiểm tra.
2. Mở CID qua IPFS gateway đáng tin cậy, kiểm tra đúng file, kiểu file, nội dung, tổ chức phát hành, ngày tháng, số tiền, phạm vi chi tiêu và mối liên hệ với campaign. Không coi việc CID/hash khớp là xác thực tính trung thực của nội dung; nó chỉ chứng minh CID đã được cam kết on-chain.
3. Đối chiếu độc lập với hóa đơn, bên cung cấp hoặc nguồn gốc tài liệu khi mức tiền/rủi ro yêu cầu. Lưu ghi chú kiểm tra và liên kết bằng chứng ngoài chuỗi có thể công khai mà không làm lộ dữ liệu cá nhân.
4. Nếu CID không mở được, hash không khớp, file không đúng như mô tả, dữ liệu có dấu hiệu giả mạo hoặc tồn tại tranh chấp: **không approve**. Ghi lại lý do và bằng chứng, thông báo cho creator/beneficiary qua kênh đã xác thực.
5. Với tài liệu sai nhưng có thể sửa, beneficiary hủy request `Pending` rồi tạo request mới với CID và hash mới. Nếu verifier kết luận yêu cầu không hợp lệ, gọi `rejectDisbursement`; trạng thái và event on-chain sẽ tạo dấu vết kiểm toán và giải phóng campaign cho request khác.
6. Với tranh chấp nghiêm trọng hoặc gian lận, reject request pending, đề nghị creator đóng campaign để ngừng nhận đóng góp, lưu CID/hash, transaction hash và biên bản kiểm tra. Không đăng công khai bản sao chứng từ có dữ liệu cá nhân.

Không dùng dữ liệu giả, CID của file khác, hoặc ảnh chụp giao diện thay cho dữ liệu/on-chain event khi kết luận trạng thái giải ngân.
