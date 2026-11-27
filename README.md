# ワイズ トーヨーCCの会

## この版について
- いただいたロゴ画像を `logo.png` として同梱し、ヘッダーに表示する構成に更新しています。
- GitHubへは **7ファイル**（`logo.png` を含む）をアップロードしてください。

## 公開手順
1. ZIPを展開し、中の7ファイルをGitHubリポジトリのmain直下にアップロードする。
2. Settings > Pages > Build and deployment > Deploy from a branch > main / (root) > Save。
3. Pagesに表示されたURLを開き、管理者アカウントでログインする。
4. 予約3件の表示、参加登録・変更・取消、CSV出力と再取込を確認する。
5. Supabase Authentication > Users で残り3名を作成し、SQL Editorで各UIDをmembersに追加する。例（UUIDを実値に置換）:
   INSERT INTO public.members (id,name,admin) VALUES ('UUID','谷中さん',false);
6. 一般メンバーで予約管理画面が表示されず、本人の回答だけ更新できることを確認する。未ログインで予約データを取得できないことも確認する。確認後にLINE共有する。

## 運用
- Supabaseを正本とし、CSVは管理者画面から取込・出力。CSVにない行は削除されない。同じ予約IDを維持すること。
- reservations.csv は入力例。実際の予約はサイトから出力したCSVを使う。ExcelではCSV UTF-8で保存する。
- 中止はサイトの状態を変更し、ゴルフ場の予約は別途キャンセルする。
- 定員超過は警告表示のみ。回答期限は画面上で制限するが、DB側の強制は未実装。開催確定は管理者が調整する。
- メンバー選択/パスワード認証（内部では @ys-toyo.example を使用）。パスワードを忘れた場合は管理者へ連絡。自動再設定画面は未実装。
- 公開リポジトリに本物の予約CSV、個人情報、秘密キー、パスワードを置かない。
- この版はロゴ表示を追加済み。実際のSupabase接続、認証、RLS、スマホ表示は公開後の確認が必要。

## Ver.1.1 移行
- 既存の森山ユーザーを削除せず、Authentication > Users でメールを moriyama@ys-toyo.example に変更し、確認済みであることとUIDが変わらないことを確認する。変更できない場合は管理者用SQL等の正式なAuth管理手段を使用し、直接authテーブルを書き換えない。
- 谷中、青木、遠藤の認証用メールは yanaka@ys-toyo.example、aoki@ys-toyo.example、endo@ys-toyo.example。各自異なるパスワードでAuto Confirmを有効にして作成し、membersテーブルへ登録する。
- 架空アドレスではメールによる復旧ができないため管理者によるパスワード再設定が必要。
- 既存ユーザーのメール変更を確認してから新しいindex.htmlとapp.jsを同時に公開する。実環境の認証は未検証。

## Ver.1.3
- 全予約日程の参加状況一覧を追加。最新情報に更新、日付から個別回答へ移動可能。
- CSV取り込み結果をボタン直下に表示。取り込み後は全日程表示。
- 更新時は index.html、app.js、style.css の3ファイルを上書き。Supabaseの変更不要。
