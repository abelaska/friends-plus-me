import styled from 'styled-components';

const GetStartedButton = styled.a`
  background-color: rgba(36, 46, 53, 0.9);
  color: #fff;
  font-size: 1rem;
  padding: 0 2.25rem;
  line-height: 3rem;
  border-radius: 24px;
  display: inline-block;
  -webkit-transition: all 0.2s;
  transition: all 0.2s;
  position: relative;
  text-decoration: none;

  &:hover {
    -webkit-box-shadow: 0 0 0 6px rgba(36, 46, 53, 0.6), 0 0 0 12px rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 0 6px rgba(36, 46, 53, 0.6), 0 0 0 12px rgba(255, 255, 255, 0.1);
  }
`;
