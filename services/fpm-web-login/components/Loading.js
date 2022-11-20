import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import DoubleRing from './DoubleRing';

const Panel = styled.div``;
const Text = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 16px;
  color: rgba(0, 0, 0, 0.7);
`;

export default ({ text, color, size = 32, border, space, panelStyle }) =>
  <Panel center="xs" style={panelStyle}>
    <div style={{ width: size, height: size, margin: '0 auto' }}>
      <DoubleRing size={size} color={color} border={border} space={space} />
    </div>
    {text &&
      <Text>
        {text}
      </Text>}
  </Panel>;
