import { Component, PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const qc = new QueryClient();

class App extends Component<PropsWithChildren> {
  componentDidMount() {}

  componentDidShow() {}

  componentDidHide() {}

  render() {
    return (
      <QueryClientProvider client={qc}>
        {this.props.children}
      </QueryClientProvider>
    );
  }
}

export default App;
