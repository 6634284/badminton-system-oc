export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/activity/list/index',
    'pages/activity/detail/index',
    'pages/wallet/index',
    'pages/my/index',
    'pages/login/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '羽毛球俱乐部',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#999',
    selectedColor: '#1890ff',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages/activity/list/index',
        text: '活动',
      },
      {
        pagePath: 'pages/wallet/index',
        text: '钱包',
      },
      {
        pagePath: 'pages/my/index',
        text: '我的',
      },
    ],
  },
});
