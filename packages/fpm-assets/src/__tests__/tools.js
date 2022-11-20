import { fixImageUrl } from '../tools';

test('should be fix url', () => {
  expect(fixImageUrl('')).toBe('');
  expect(
    fixImageUrl(
      'https://lh3.googleusercontent.com/-JcwjtHDuaAA/WW8ZMsPNHAI/AAAAAAAApwA/KV9MJEMddLkzcm2YEopUYzWoJ5kcH04NACJoC/w530-h439-p-rw/Dragos-Anca-Sanziene-in-Urban-2016-Photo-4-eng_1.jpg'
    )
  ).toBe(
    'https://lh3.googleusercontent.com/-JcwjtHDuaAA/WW8ZMsPNHAI/AAAAAAAApwA/KV9MJEMddLkzcm2YEopUYzWoJ5kcH04NACJoC/s0/Dragos-Anca-Sanziene-in-Urban-2016-Photo-4-eng_1.jpg'
  );
  expect(
    fixImageUrl(
      'https://media.licdn.com/mpr/mpr/AAEAAQAAAAAAAAL0AAAAJDgwNTY2ZTM2LTlhOWQtNGJlYS1iMzk5LWE1OWYyYzZmYjA4ZQ.jpg'
    )
  ).toBe('https://media.licdn.com/mpr/mpr/AAEAAQAAAAAAAAL0AAAAJDgwNTY2ZTM2LTlhOWQtNGJlYS1iMzk5LWE1OWYyYzZmYjA4ZQ.jpg');
  expect(
    fixImageUrl(
      'https://3.bp.blogspot.com/-Ol0zOXIrBu8/WW-FcMKQVWI/AAAAAAAAcjQ/x0xU0Nrw52wSxCPJLJH1iVSRWnQeSK4pwCLcBGAs/w530-h398-p-rw/DSCN1441%2B%25283%2529.JPG'
    )
  ).toBe(
    'https://3.bp.blogspot.com/-Ol0zOXIrBu8/WW-FcMKQVWI/AAAAAAAAcjQ/x0xU0Nrw52wSxCPJLJH1iVSRWnQeSK4pwCLcBGAs/s0/DSCN1441%2B%25283%2529.JPG'
  );
  expect(
    fixImageUrl(
      'https://2.bp.blogspot.com/-mhuO-YZRDS8/WW_LHkvuILI/AAAAAAAAB54/2nvVvazacmsk4U6GKZnka-znDbrJuN3HwCLcBGAs/s640/image1.gif'
    )
  ).toBe(
    'https://2.bp.blogspot.com/-mhuO-YZRDS8/WW_LHkvuILI/AAAAAAAAB54/2nvVvazacmsk4U6GKZnka-znDbrJuN3HwCLcBGAs/s0/image1.gif'
  );
});
