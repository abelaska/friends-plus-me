export const customers = [
  {
    name: 'Martin Shervington',
    title: 'Speaker, Consultant, Author, Marketing Psychologist',
    photo: 'https://lh5.googleusercontent.com/-74yZewNa7Lc/AAAAAAAAAAI/AAAAAAABsWs/PRheuo2uAtg/photo.jpg?sz=60',
    link: 'https://plus.google.com/114918475211209783081',
    quote:
      'I think Friends+Me is an awesome tool that enables your Google+ content to really fly out the door and into other networks. <b>Highly Recommend.</b>'
  },
  {
    name: 'Andrij "Andrew" Harasewych',
    title: 'Marketing Strategist',
    photo: 'https://lh3.googleusercontent.com/-RiT4Ny7IE7U/AAAAAAAAAAI/AAAAAAACFek/HlJTRf7fRCU/photo.jpg?sz=60',
    link: 'https://plus.google.com/103008963082975341976',
    quote:
      '<b>Friends+Me is a great solution for finding the perfect balance</b> between an engaging social presence and the social automation we need as marketers and business owners to keep from going absolutely insane with busy work.'
  },
  {
    name: 'Mark Traphagen',
    title: 'Senior Director of Online Marketing',
    photo: 'https://lh3.googleusercontent.com/-kT6hRDf1K8U/AAAAAAAAAAI/AAAAAAABbOM/FKcofSyPuNw/photo.jpg?sz=60',
    link: 'https://plus.google.com/107022061436866576067',
    quote:
      "There simply isn't a better tool for resharing your Google+ content to other networks than Friends+Me. I love both the flexibility of choosing where I share (or if I share at all) using hashtags. And for Twitter, F+M automatically makes my Google+ post title line the tweet text.<br>Perfect! <b>I use Friends+ Me every day.</b>"
  },
  {
    name: 'Ben Fisher',
    title: 'Social SEO Strategist',
    photo: 'https://lh5.googleusercontent.com/-q0VyZL-5YMM/AAAAAAAAAAI/AAAAAAAABow/UvW7t40H-gU/photo.jpg?sz=60',
    link: 'https://plus.google.com/102572320061138442096',
    quote:
      'Once I saw Friends+Me I had to try it out. Now <b>we recommend Friends+Me to all of our Google Plus brand management customers</b>. This allows our clients to focus on one network and syndicate posts effortlessly to other social networks.'
  },
  {
    name: 'Wade Harman',
    title: 'Relationship Marketing Expert',
    photo: 'https://lh5.googleusercontent.com/-aP6K2_DaQl4/AAAAAAAAAAI/AAAAAAAAMTU/4n5QesJFPv0/photo.jpg?sz=60',
    link: 'https://plus.google.com/+WadeHarman',
    quote:
      'Friends+Me has been a direct asset in helping me become more visible across all of social media. <b>The easy to use platform helps you to set it and go about your business on social.</b> It takes care of the rest. That helps people keep you "Top of Mind" and that\'s important! <b>I\'ll always use Friends+Me!</b>'
  },
  {
    name: 'Carole Rigonalli',
    title: 'Business Owner',
    photo: 'https://lh6.googleusercontent.com/-kNUFAcwLRgg/AAAAAAAAAAI/AAAAAAAAiEQ/Vky8N87e6rE/photo.jpg?sz=60',
    link: 'https://plus.google.com/113708489830879834550',
    quote:
      'As an entrepreneur and owner of 3 companies I know how crucial social media is. Since beta stage Friends+Me have offered outstanding service plus are constantly striving to get even better.<br>With Alois Bělaška and team <b>we found a service that meets our high requirements in style, functionality and actuality and quality.</b>'
  },
  {
    name: 'Ian Anderson Gray',
    title: 'Social Media Consultant & Trainer',
    photo: 'https://lh5.googleusercontent.com/-f4zJHsysXWU/AAAAAAAAAAI/AAAAAAAAJeY/rKd1POb-GLA/photo.jpg?sz=60',
    link: 'https://plus.google.com/118089425632910430111',
    quote:
      "I use Friends+Me every day and <b>it is not an exaggeration to say it has been integral to the growth of my social part of our business</b>. As well as turning Google+ into a powerful social media management tool which allows you to cross post selectively and intelligently to a plethora of social channels it's allowed me to invest in Google+ and it's wonderful community.",
    quoteShort:
      'I use Friends+Me every day and <b>it is not an exaggeration to say it has been integral to the growth of my social part of our business</b>.'
  },
  {
    name: 'Jeff Roach',
    title: 'Strategic Connector and CEO of Sociallogical.com',
    photo: 'https://lh5.googleusercontent.com/-FocHrud2Luw/AAAAAAAAAAI/AAAAAAAAh-g/LROYPbOGTYQ/photo.jpg?sz=60',
    link: 'https://plus.google.com/116229771858126207183',
    quote:
      'I don’t expect everyone to jump on this but for those who already know the superior value of Google+, <b>this simple little service makes it easy to make Plus the centre of your sharing activity without causing you to lose the social networks you’ve built elsewhere</b>.'
  },
  {
    name: 'Jonathan MacDonald',
    title: 'Thought expander and professional speaker',
    photo: 'https://lh4.googleusercontent.com/-4DKoakXp8qs/AAAAAAAAAAI/AAAAAAAAI3w/FwzbL9knIbE/photo.jpg?sz=60',
    link: 'https://plus.google.com/110716550870137087250',
    quote:
      'I love Friends+Me. <b>It has totally streamlined my social sharing</b> and I’m now reliant on it to ensure cross-platform content. <b>Brilliant work!</b>'
  },
  {
    name: 'Ben Johnston',
    title: 'Graphic designer',
    photo: 'https://lh3.googleusercontent.com/-SPCseUqXpHY/AAAAAAAAAAI/AAAAAAAAAHk/xuDPAp7KAzw/photo.jpg?sz=60',
    link: 'https://plus.google.com/106047137421326227626',
    quote:
      "Easy to use, yet you've got the control of getting the post looking just how you want it in Google+. Scheduling works really well too.<br><b>A lot simpler to use than many social media management tools!</b>",
    quoteShort:
      "Easy to use, yet <b>you've got the control of getting the post looking just how you want it</b> in Google+."
  }
];

export const customerByName = name => {
  return customers.filter(c => c.name === name)[0];
};

export const randomCustomers = count => {
  const used = {};
  const list = [];
  let idx;
  while (list.length < count) {
    idx = Math.floor(Math.random() * customers.length);
    if (used[`${idx}`] !== 1) {
      used[`${idx}`] = 1;
      list.push(customers[idx]);
    }
  }
  return list;
};
