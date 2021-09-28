const scriptName = "브리핑";
const AtomicInteger = java.util.concurrent.atomic.AtomicInteger;
const AtomicLong = java.util.concurrent.atomic.AtomicLong;

/*
Atomic 자료형에 대한 이해가 부족하여
굳이 Atomic 자료형으로 하지 않아도 되는 변수들도 Atomic 자료형으로
선언한게 있을 수 있습니다. 가르침 환영합니다.

일단 작동은 잘 됩니다.
*/


let btcPOWER = new AtomicInteger(0); // 가격알람봇 On/Off
// AtomicBoolean으로도 가능할 것 같습니다.

// 저는 SetInterval 대신 아래의 코드를 사용했습니다.
function sleep(ms) {
    TIME_1 = new Date().getTime() + ms;
    do TIME_2 = new Date().getTime(); while (TIME_2 < TIME_1);
}

// 가격에 쉼표를 넣어줍니다.
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 현재 가격, 이전 가격을 기준으로 특정 가격대 x가 사이에 있는지 여부를
// boolean으로 리턴합니다.
function between(x, min, max) {
    return x >= min && x <= max;
}


function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
    try {
        if (room === "관리자 이름") {
            if (msg == "비트코인 체크") {
                replier.reply("비트코인 가격을 10초 간격으로 체크하여 검사합니다.");

                // 이미 켜져있을 경우 종료
                if (btcPOWER.get() == 1) { 
                    replier.reply("이미 알람이 작동중입니다.");
                    return;
                }

                btcPOWER.set(1);

                var nowForCoinBrif = new Date();
                var urlBinance = "https://api.binance.com/api/v3/klines?interval=1d&symbol=BTCUSDT&startTime=" + (nowForCoinBrif.getTime()-86400001).toString();
                var metaBinance = JSON.parse(org.jsoup.Jsoup.connect(urlBinance).ignoreContentType(true).get().text());
                metaBinance = metaBinance[metaBinance.length - 1];
                var BTCcurrentPrice = parseFloat(metaBinance[4]);
                // 우선 가격비교를 하려면 초기 가격이 있어야 하니 한번은 가격을 불러와줍니다.

                var btcPriceBefore = new AtomicLong(BTCcurrentPrice); // 가져온 초기 가격을 저장합니다.

                var atomicI = new AtomicInteger(0); // 아래에서 알람이 울린 가격대를 저장하기 위한 변수입니다.
                // 정확한 이해는 아래의 무한루프문을 참고해주세요.

                var excludeIforThisTime = new AtomicLong(0); // 알람이 울렸을 경우, 1시간동안 해당 가격대의 알람은
                // 울리지 않도록 하기 위해 이 변수에 알람이 울린 1시간 후의 UNIX Time을 넣습니다.

                while (btcPOWER.get() == 1) {
                    sleep(10000);
                    // 우선 10초 쉬어줍니다.

                    nowForCoinBrif = new Date();
                    urlBinance = "https://api.binance.com/api/v3/klines?interval=1d&symbol=BTCUSDT&startTime=" + (nowForCoinBrif.getTime()-86400001).toString();
                    metaBinance = JSON.parse(org.jsoup.Jsoup.connect(urlBinance).ignoreContentType(true).get().text());
                    metaBinance = metaBinance[metaBinance.length - 1];
                
                    BTCcurrentPrice = parseFloat(metaBinance[4]); // 현재가를 가져옵니다.

                    var min = BTCcurrentPrice > btcPriceBefore.get() ? btcPriceBefore.get() : BTCcurrentPrice;
                    var max = BTCcurrentPrice <= btcPriceBefore.get() ? btcPriceBefore.get() : BTCcurrentPrice;
                    // 현재가(BTCcurrentPrice)와 이전가(btcPriceBefore)의 가격을 비교해서 min, max값을 저장합니다.
                    // between 함수에 넣기 위함입니다.

                    var isGoingUP = BTCcurrentPrice > btcPriceBefore.get(); // 상승/하락 여부를 확인합니다.

                    var changePrice = (parseFloat(metaBinance[4]) - parseFloat(metaBinance[1])).toFixed(2); // 가격변동을 확인합니다.
                    // 이 때, 가져오는 metaBinance[1]은 일봉의 Open Price입니다.

                    var changeRate = ((changePrice / parseFloat(metaBinance[1])) * 100).toFixed(2); // 가격변동 백분율을 저장합니다.

                    var sign = changePrice > 0 ? "+" : ""; // 가격변동이 양수일 경우 + 기호를 넣어주기 위함입니다.

                    var siren = "[  🚨비트코인 가격 알람🚨  ]\n\n";

                    for (var i = 35; i < 60; i ++ ) { 
                        // 35K ~ 60K를 1K 단위로 검사하는 for문입니다.

                        if (nowForCoinBrif.getTime() < excludeIforThisTime.get() && i == atomicI.get()) continue;
                        // 만약 현재 시간이 excludeIforThisTime보다 이전이고,
                        // 현재 검사하는 가격이 atomicI에 저장된 가격이라면 검사하지 않습니다.
                        // 이는 위에서 말했듯 특정 가격대 횡보시 알람이 과도하게 울리는 것을 방지하기 위함입니다.

                        else if (nowForCoinBrif.getTime() >= excludeIforThisTime.get()) atomicI.set(0);
                        // 만약 현재 시간이 excludeIforThisTime 이후라면
                        // atominI는 0으로 세팅하고 for문을 계속 진행합니다.
                        // excludeIforThisTime(알람이 울리고 1시간 뒤) 이후에는 다시 이전 알람이 울린 가격대도 검사합니다.

                        if (between(i * 1000, min, max)) {
                            siren += ("비트코인 가격이 " + i + "K에 " + (isGoingUP ? "상승하며" : "하락하며") + " 도달했습니다.\n(한시간 동안 " + i + "K 알람은 울리지 않습니다.)\n\n현재가 : " + numberWithCommas(BTCcurrentPrice.toFixed(2)) + " USDT\n");
                            siren += ("( 1일봉 기준 " + sign + changePrice + " USDT, " + sign + changeRate + " % )");

                            Api.replyRoom("알람울릴 방 이름", siren);

                            excludeIforThisTime.set(new Date().getTime() + 3600000); // 1시간 뒤까지 해당 가격 알람은 울리지 않습니다.

                            atomicI.set(i); // 알람이 울린 가격을 저장합니다.

                            break;
                            // 일단 검사에 걸리면 for문을 탈출합니다.
                            // 10초만에 2K 이상 움직이지 않을것이라는 가정 하에 작성한 부분입니다.
                        }
                    }

                    btcPriceBefore.set(BTCcurrentPrice); // 가격검사가 끝나면 현재가를 이전가로 저장합니다.
                }
            }

            if (msg == '비트코인 체크 중지') {
                if (btcPOWER.get() == 0) {
                    replier.reply('진행중인 체크가 없습니다.');
                } else {
                    btcPOWER.set(0);
                    replier.reply('비트코인 체크를 중지했습니다.');
                }
            }  
        }
    }
    catch (e) {
        Api.replyRoom("개발자 이름", "[ 가격알람봇 오류발생🚨  ]\n\n오류 이름: " + e.name + "\n오류 메시지: " + e.message + "\n오류 위치: " + e.lineNumber);
    }
}