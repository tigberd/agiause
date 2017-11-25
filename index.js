const Chromy = require("chromy");

async function login(chromy) {
  await chromy.insert("#ap_email", process.env.AMAZON_ID);

  const passwordField = await chromy.evaluate(() =>
    document.querySelector("#ap_password")
  );
  if (!passwordField) {
    await chromy.click("#continue");
    await chromy.waitLoadEvent();
  }

  await chromy.insert("#ap_password", process.env.AMAZON_PASSWORD);
  await chromy.click("#signInSubmit");
  await chromy.waitLoadEvent();
}

async function confirmGift(chromy) {
  await chromy.goto("https://www.amazon.co.jp/dp/B004N3APGO/");
  await chromy.wait(1000);
  await chromy.click("#gc-order-form-custom-amount");
  await chromy.insert("#gc-order-form-custom-amount", process.env.GIFT_AMOUNT);
  await chromy.insert("#gc-order-form-recipients", process.env.TARGET_MAIL);
  await chromy.click("#gc-buy-box-bn");
  await chromy.waitLoadEvent();
}

async function countCards(chromy) {
  let count;
  while (true) {
    await chromy.wait(500);
    let i = await chromy.evaluate(
      () => document.querySelectorAll("[name='paymentMethod']").length
    );
    if (i !== 0) {
      count = i;
      break;
    }
  }
  return count - 2;
}

async function main() {
  let count;
  let i = 0;
  const chromy = new Chromy({ visible: true });

  while (true) {
    // ギフトカードのページを開いて金額入力
    await confirmGift(chromy);

    // ログインが必要であればログイン
    if (await chromy.evaluate(() => document.querySelector("#ap_email"))) {
      await login(chromy);
    }

    // 支払い方法変画面を開く
    if (
      await chromy.evaluate(() =>
        document.querySelector("#payment-change-link")
      )
    ) {
      await chromy.click("#payment-change-link");
    }

    // クレジットカード一覧が出るのを待ち、出力されていれば要素数をカウント
    count = await countCards(chromy);

    // カードを選択し、確定ボタンが出るまで待機
    await chromy.check(`#pm_${i}`);
    await chromy.click("#continue-top");
    while (true) {
      await chromy.wait(500);
      if (
        await chromy.evaluate(
          () => document.querySelectorAll(".place-your-order-button").length
        )
      ) {
        break;
      }
    }

    // 指定した金額が含まれているかチェックして含まれていなかった場合処理をやり直す
    while (true) {
      await chromy.wait(500);
      if (
        await chromy.evaluate(
          () => document.querySelectorAll(".grand-total-price").length
        )
      ) {
        break;
      }
    }

    const amount = await chromy.evaluate(() => {
      return document.querySelector(".grand-total-price").innerText.replace(',', '');
    });
    if (!amount.includes(process.env.GIFT_AMOUNT)) {
      continue;
    }

    // 購入ボタンを押す
    await chromy.click(".place-your-order-button");

    // 購入成功画面が出るまで待機
    while (true) {
      await chromy.wait(500);
      if (
        await chromy.evaluate(() =>
          document.querySelectorAll(".a-alert-success")
        )
      ) {
        break;
      }
    }

    // iをインクリメントして次のカードの処理に移行
    i++;
    if (i >= count) {
      break;
    }
  }

  await chromy.close();
}

main();
