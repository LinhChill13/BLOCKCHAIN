# Seed data demo

`seed-demo.ts` chỉ dùng cho Hardhat localhost. Script tự deploy `Crowdfunding` mới và dùng các account local để tạo dữ liệu nhất quán, không cần nhập private key hay địa chỉ contract trước.

## Cách chạy

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npm run seed:demo -- --network localhost
```


## Các account local

| Vai trò | Account Hardhat | Dùng để làm gì |
| --- | --- | --- |
| Organization | `#0` | Tạo cả bốn campaign. |
| Beneficiary A | `#1` | Tạo request cho campaign 0 và 1; rút request đã duyệt ở campaign 1. |
| Donor | `#2` | Quyên góp ETH cho mọi campaign. |
| Verifier A | `#3` | Verifier của campaign 0 và 3. |
| Verifier B | `#4` | Verifier riêng của campaign 1. |
| Beneficiary B | `#5` | Tạo request cho campaign 2 và 3. |
| Verifier C | `#6` | Verifier riêng của campaign 2. |

## Bốn campaign được tạo

| ID | `metadataId` | Quyên góp | Request | Trạng thái cuối | Ý nghĩa |
| --- | --- | ---: | ---: | --- | --- |
| 0 | `school-library` | 0.6 ETH | 0.15 ETH | `Pending` | Verifier A chưa đưa ra quyết định; đây là request đang hoạt động duy nhất. |
| 1 | `flood-relief` | 1 ETH | 0.25 ETH | `Withdrawn` | Verifier B đã duyệt, Beneficiary A đã rút đúng 0.25 ETH. Contract còn giữ 0.75 ETH. |
| 2 | `community-clinic` | 0.4 ETH | 0.1 ETH | `Rejected` | Verifier C từ chối do bằng chứng minh họa chưa đầy đủ. Request không còn khóa campaign; 0.4 ETH vẫn trong contract. |
| 3 | `emergency-food` | 0.3 ETH | 0.05 ETH | `Cancelled` | Beneficiary B tự hủy request sai amount. Request không còn khóa campaign; 0.3 ETH vẫn trong contract. |

## Thành phần của một campaign

- `id`: mã campaign tăng dần, dùng trong mọi hàm như `donate(1)`.
- `creator`: ví tổ chức tạo campaign.
- `beneficiary`: ví tạo request và là ví duy nhất được rút một request đã duyệt.
- `verifier`: ví độc lập, khóa theo campaign, có quyền duyệt hoặc từ chối request `Pending`.
- `targetAmount`: mục tiêu gây quỹ, không giới hạn số ETH thực tế donor có thể gửi.
- `deadline` và `status`: thời hạn/trạng thái nhận donation. `Closed` chỉ ngăn donation mới, không ngăn xử lý request.
- `totalRaised`: tổng ETH donor đã gửi vào campaign.
- `totalWithdrawn`: tổng ETH đã giải ngân thành công.
- `available = totalRaised - totalWithdrawn`: mức tối đa cho request kế tiếp.
- `metadataId`: nhãn metadata on-chain; dữ liệu dài như mô tả, ảnh và chứng từ nên nằm trên IPFS/database công khai.

## Thành phần của request

- `requestId`: số thứ tự request trong một campaign, bắt đầu từ `1`.
- `amount`: số ETH beneficiary đề nghị giải ngân; không được vượt `available`.
- `evidenceHash`: `bytes32` hash của bằng chứng, ví dụ hash liên quan đến tài liệu trên IPFS.
- `status`:
  - `Pending`: chờ verifier duyệt/từ chối; beneficiary có thể hủy.
  - `Approved`: beneficiary được rút đúng `amount`.
  - `Rejected`: verifier đã từ chối; có thể tạo request mới.
  - `Withdrawn`: tiền đã được chuyển; không thể thao tác lại request này.
  - `Cancelled`: beneficiary đã hủy; có thể tạo request mới.

`activeRequestId` chỉ khác `0` khi request đang `Pending` hoặc `Approved`. Vì vậy request `Rejected`, `Cancelled` và `Withdrawn` không thể làm kẹt luồng giải ngân.
