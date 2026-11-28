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
   INSERT INTO public.members (id,name,admin) VALUES ('UUID','谷中',false);
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

## Ver.1.4 予約削除
- Supabase SQL Editorで別添の `04_round_delete.sql` を実行してから、更新4ファイルをGitHubに上書きする。
- 管理者だけに「予約を削除」が表示される。確認後、予約と関連する参加回答を完全削除する。DBのRLSでも管理者のみ許可する。
- ゴルフ場の予約は別途キャンセルする。削除したIDが古いCSVに含まれていれば再取り込みで復活するため、削除後は最新CSVを出力して使用する。
- 取消履歴を残す場合は削除ではなく状態を「中止」に変更する。
- 本番環境での削除・一般ユーザー拒否テストは未実施。テスト用の予約を追加して確認すること。

## Ver.1.5
- 予約保存結果・入力エラーを保存ボタン直下に表示。保存中はボタンを無効化。保存後は対象月を表示。
- 既存の予約削除・参加一覧・CSV取込機能を維持。追加SQL不要。

## v1.6
先に SQL Editor で 05_round_booker.sql を実行。更新ZIPの6ファイルを main 直下へ。過去日程は日本時間で非表示（DB・全予約CSVには保持）。参加一覧は overview.html。予約者未設定の既存予約は管理者が編集して設定。新規CSVには予約者列を指定（旧CSVで既存予約更新時は保持）。キャンセル目安はプレー3日前、仮予約・参加募集中・中止に表示。開催確定・終了は対象外。ゴルフ場への自動キャンセル・通知はなし。

## v1.7
キャンセル確認期限をプレー日の3日前に変更。既存の v1.6 環境では SQL の追加実行は不要。

## Ver.1.8
- CSVのUTF-8/Shift_JIS/UTF-16 BOMを判定。必須見出しを名前で照合し、列順の変更・余分な列・空行に対応。エラーに不足見出しやデータ行番号を表示。
- 更新時は index.html、overview.html、app.js、style.css、README.md、reservations-template.csv を上書き。追加SQL不要。

## v1.9 PWA対応
- ZIP内の全11ファイルをリポジトリ直下に配置。既存の config.js と logo.png は保持。
- Android Chrome: インストールボタン、またはメニューからインストール。iPhone Safari: 共有→ホーム画面に追加。LINE内ブラウザからは外部ブラウザを開く。
- HTTPS必須。オフラインでは予約情報を表示・保存しない。APIや会員情報をService Workerにキャッシュしない。
- 実機でのインストールとログインは公開後に確認。

## v1.9.1
表示名の末尾の「さん」を省略。既存DBの名前とUIDは維持。CSVの予約者は敬称あり・なし両方を受け付ける。

## v1.9.2
- 両ページのログイン選択肢が敬称なしであることを再確認。フッターに版番号を表示し、HTMLの再取得を強化。

## v1.9.3
- CSV取り込み時にカンマ・タブ・セミコロン区切りを見出しから判定。Shift_JIS/UTF-8等の既存対応を維持。追加SQL不要。

## v1.9.4
Google検索対応：トップページのタイトル・説明・canonical・OGP・WebSite構造化データ・favicon・sitemap.xmlを追加。overview.htmlはnoindex。ログイン欄はdata-nosnippet（非公開化ではない）。Google所有権確認HTMLとconfig.js、logo.pngは削除しない。Search Consoleに https://metachan-golf.github.io/ys-toyo-golf/sitemap.xml を登録し、トップURLのインデックス登録をリクエスト。実予約CSVは公開リポジトリから削除を推奨（過去のコミットにも残り得る）。
