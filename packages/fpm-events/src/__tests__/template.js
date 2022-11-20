const test = require('ava');
const { renderEmail } = require('../template');

test('should render post-publishing-failed template', t => {
  const html = renderEmail('post-publishing-failed', {
    post_id: 'post_id',
    post_html: '<p>Message line 1</p><p>Message line 2</p>',
    post_link: 'http://link.com/url',
    post_link_title: 'link title',
    post_link_picture:
      'https://lh3.googleusercontent.com/proxy/IgnXH_6W6qMOPyZUnE2iP974lRDeaPjwo7vvR_oxFvdM4DGgxtFSJHCAx1U82KR8Xot8TOJUgRd2eRT2xBi3YCmntmz7eQB0TiDmhcqMzd0rag5DwPXq8cc',
    post_picture: undefined,

    // post_link: undefined,
    // post_link_title: undefined,
    // post_link_picture: undefined,
    // post_picture:
    //   'https://lh3.googleusercontent.com/proxy/IgnXH_6W6qMOPyZUnE2iP974lRDeaPjwo7vvR_oxFvdM4DGgxtFSJHCAx1U82KR8Xot8TOJUgRd2eRT2xBi3YCmntmz7eQB0TiDmhcqMzd0rag5DwPXq8cc',
    team_id: 'team_id',
    team_name: 'team_name',
    account_id: 'account_id',
    account_name: 'account_name',
    account_avatar:
      'https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50-cc/photo.jpg',
    account_network: 'facebook',
    account_network_name: 'Facebook',
    account_type: 'profile',
    account_type_name: 'Profile'
  });
  // console.log(html);
  // require('fs').writeFileSync('/Users/abelaska/a.html', html, { encoding: 'utf-8' });
});

test('should render account-requires-reconnect-instagram template', t => {
  const html = renderEmail('account-requires-reconnect-instagram', {
    post_id: 'post_id',
    post_html: '<p>Message line 1</p><p>Message line 2</p>',
    post_link: 'http://link.com/url',
    post_link_title: 'link title',
    post_link_picture:
      'https://lh3.googleusercontent.com/proxy/IgnXH_6W6qMOPyZUnE2iP974lRDeaPjwo7vvR_oxFvdM4DGgxtFSJHCAx1U82KR8Xot8TOJUgRd2eRT2xBi3YCmntmz7eQB0TiDmhcqMzd0rag5DwPXq8cc',
    post_picture: undefined,

    // post_link: undefined,
    // post_link_title: undefined,
    // post_link_picture: undefined,
    // post_picture:
    //   'https://lh3.googleusercontent.com/proxy/IgnXH_6W6qMOPyZUnE2iP974lRDeaPjwo7vvR_oxFvdM4DGgxtFSJHCAx1U82KR8Xot8TOJUgRd2eRT2xBi3YCmntmz7eQB0TiDmhcqMzd0rag5DwPXq8cc',
    team_id: 'team_id',
    team_name: 'team_name',
    account_id: 'account_id',
    account_name: 'account_name',
    account_avatar:
      'https://lh3.googleusercontent.com/-TBgNki-dgJs/AAAAAAAAAAI/AAAAAAADVq8/G8RPk8VD2ak/s50-cc/photo.jpg',
    account_network: 'facebook',
    account_network_name: 'Facebook',
    account_type: 'profile',
    account_type_name: 'Profile'
  });
  // console.log(html);
  // require('fs').writeFileSync('/Users/abelaska/a.html', html, { encoding: 'utf-8' });
});
