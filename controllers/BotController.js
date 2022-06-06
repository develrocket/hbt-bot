var express = require('express');
var bodyParser = require('body-parser');
var urlencodeParser = bodyParser.urlencoded({ extended: false });
var validator = require('express-validator');
const { curly } = require('node-libcurl');
var axios = require("axios");

module.exports = function () {
		return {
		    buyToken: async function(req, res) {
						let token = req.body.token;
						let amount = req.body.amount;
						let cookie = req.body.cookie;
						let userAgent = req.body.userAgent;
						let browser = req.body.browser;

						token = token.toUpperCase();

						let config = {
		            method: 'get',
		            url: '',
		            headers: {
		                'Content-Type': 'application/x-www-form-urlencoded'
		            }
		        };

						config.url = 'https://api.hotbit.io/api/v1/market.last?market=' + token + '/USDT';

						// 1. Get Token Price
						let priceResult = await axios(config);
						priceResult = priceResult.data;

						if (priceResult.error) {
								console.log('price-result-error');
								return res.json({
										result: 'failed',
										amount: 0
								});
						}

						// 2. Set Price Limit
						let tokenPrice = priceResult.result;
						tokenPrice = tokenPrice * 1.01;

						// 3. Get Order Book
						config.url = 'https://api.hotbit.io/api/v1/order.book?market=' + token + '/USDT&side=1&offset=0&limit=1000';
		        let bookResults = await axios(config);
						bookResults = bookResults.data;

						if (bookResults.error) {
								console.log('book-result-error');
								return res.json({
										result: 'failed',
										amount: 0
								});
						}

						bookResults = bookResults.result.orders;

						let orders = [];
						for (let i = 0; i < bookResults.length; i ++) {
								orders.push(bookResults[i]);
						}

						orders.sort((a, b) => a.price * 1 - b.price * 1);


						// 4. Set token count and price to Buy
						let isBuy = false;
						let maxPrice = 0;
						let maxCount = 0;
						let buyPrice = 0;
						let buyCount = 0;
						for (let i = 0; i < orders.length; i ++) {
								let item = orders[i];
								if (item.price * 1 > tokenPrice) break;
								let bc = amount / (item.price * 1);
								if (bc <= item.left * 1) {
										buyCount = bc.toFixed(1);
										buyPrice = item.price * 1;
										isBuy = true;
										break;
								}
								if (maxCount < item.left * 1) {
										maxCount = item.left * 1;
										maxPrice = item.price * 1;
								}
						}

						if (!isBuy) {
								buyPrice = maxPrice;
								buyCount = maxCount;
						}

						if (buyCount == 0) {
								console.log('buy-count-error');
								return res.json({
										result: 'failed',
										amount: 0
								});
						}

						//Buy Token
						// config = {
		        //     method: 'POST',
		        //     url: 'https://www.hotbit.io/v1/order/create?platform=web',
		        //     headers: {
						// 				':authority': 'www.hotbit.io',
						// 				':method': 'POST',
						// 				':path': '/v1/order/create?platform=web',
						// 				':scheme': 'https',
		        //         'Content-Type': 'application/x-www-form-urlencoded',
						// 				'Cookie': cookie,
						// 				'User-Agent': userAgent,
						// 				origin: 'https://www.hotbit.io',
						// 				referer: 'https://www.hotbit.io/exchange?symbol=RSR_USDT',
						// 				'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
						// 				'sec-ch-ua-mobile': '?0',
						// 				'sec-ch-ua-platform': "Windows",
						// 				'sec-fetch-dest': 'empty',
						// 				'sec-fetch-mode': 'cors',
						// 				'sec-fetch-site': 'same-origin'
		        //     },
						// 		data: {
						// 	    	price: buyPrice,
						// 	    	quantity: buyCount,
						// 				market: token + '/USDT',
						// 				side: 'BUY',
						// 				type: 'LIMIT',
						// 				hide: false,
						// 				use_discount: false
						// 	  }
		        // };
						//
						// let buyResult = await axios(config);
						// buyResult = buyResult.data;

						// console.log(buyResult);

						const { data } = await curly.post('https://www.hotbit.io/v1/order/create?platform=web', {
							  postFields: JSON.stringify({
										    	price: buyPrice,
										    	quantity: buyCount,
													market: token + '/USDT',
													side: 'BUY',
													type: 'LIMIT',
													hide: false,
													use_discount: false
										  }),
							  httpHeader: [
									':authority: www.hotbit.io',
									':method: POST',
									':path: /v1/order/create?platform=web',
									':scheme: https',
					        'Content-Type: application/x-www-form-urlencoded',
									'Cookie: '+ cookie,
									'User-Agent: ' + userAgent,
									'origin: https://www.hotbit.io',
									'referer: https://www.hotbit.io/exchange?symbol=RSR_USDT',
									'sec-ch-ua: " Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
									'sec-ch-ua-mobile: ?0',
									'sec-ch-ua-platform: Windows',
									'sec-fetch-dest: empty',
									'sec-fetch-mode: cors',
									'sec-fetch-site: same-origin'
							  ],
						})

						console.log(data);

						return res.json({
								result: 'failed',
								amount: 0
						});

						if (buyResult.code * 1 != 1100) {
								console.log('buy-result-error');
								return res.json({
										result: 'failed',
										amount: 0
								});
						} else {

								//check Book Order that is pending.
								let id = buyResult.Content.id;
								config = {
				            method: 'get',
				            url: 'https://api.hotbit.io/api/v1/order.book?market=' + token + '/USDT&side=1&offset=0&limit=1000',
				            headers: {
				                'Content-Type': 'application/x-www-form-urlencoded'
				            }
				        };
								let bookResults = await axios(config);
								bookResults = bookResults.data;
								bookResults = bookResults.result.orders;
								bookResults = bookResults.filter((item) => {
                    return item.id == id;
                });
								if (bookResults.length > 0) {
										console.log('check-result-error');
										return res.json({
												result: 'failed',
												amount: 0
										});
								}
						}

		        res.json({
								result: 'success',
								buyPrice: buyPrice,
								buyCount: buyCount
						});
		    },
		}
};
