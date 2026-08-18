# Metrics — CrowdfundChain MVP

## Môi trường đo

- Network: Ethereum Sepolia (chain ID 11155111)
- Contract: 0x57d9A07100CeF698EE29c22d8aFB780de45F252A
- Compiler: solc 0.8.24

## Gas và chi phí

| Thao tác | Transaction | Gas used | Gas price | Transaction fee | Kết quả |
|---|---|---:|---:|---:|---|
| Create campaign | `0x0bbd55adfd3004c3793ea1ab2354babc5082f885c6566f12ecd8182385bda849` | 194.102 | 2.44341376 gwei | 0.00047427149764352 ETH | `CampaignCreated` |
| Donate | `0x55882d8f8aae3c82df91c5d49a0a29cc597ee696351da7bb3634077e2cb71df7` | 74,954 | 2.609753185 gwei | 0.00019561144022849 ETH | `DonationReceived` |
| Create request | `0x36ab2040066cec4c89539635f4e09965375b42117b2d3ccc4598bf790a730fa3` | 196.508 | 2.618773861 gwei | 0.000514610013877388 ETH | `DisbursementRequested` |
| Approve request | `0x5a4040a313f3f92cde68ac5610c41d8f7a38ee4f4452724346ed9dac35afbe33` | 53,014 | 2.621841544 gwei | 0.000138994307613616 ETH | `DisbursementApproved` |
| Withdraw | `0x36ac03482d6bf8dcb7ba7f9923b9b5c3376e47be6c3ac11d912845270d8eedad` | 68,919 | 2.535422412 gwei | 0.000174738777212628 ETH | `FundsWithdrawn` |

## Nhận xét

- Chi phí thay đổi theo gas price của Sepolia tại thời điểm gửi.
- `Gas used` phù hợp để so sánh tương đối giữa các thao tác.
- `Transaction fee` chỉ là phí testnet tham khảo, không dùng để khẳng định chi phí vận hành thực tế tại Việt Nam.