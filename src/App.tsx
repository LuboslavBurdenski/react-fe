import * as React from 'react';
import styled from 'styled-components';
import { US_ELECTION_ADDRESS } from './constants';
import { getContract } from './helpers/ethers';
import US_ELECTION from './abis/US_ELECTION.json';
import Web3Modal from 'web3modal';

// @ts-ignore
import WalletConnectProvider from '@walletconnect/web3-provider';
import Column from './components/Column';
import Wrapper from './components/Wrapper';
import Header from './components/Header';
import Loader from './components/Loader';
import ConnectButton from './components/ConnectButton';


import { Web3Provider } from '@ethersproject/providers';
import { getChainData } from './helpers/utilities';

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;


const SContent = styled(Wrapper)`
  width: 100%;
  height: 100%;
  padding: 0 16px;
`;

const SContainer = styled.div`
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  word-break: break-word;
`;

const SLanding = styled(Column)`
  height: 600px;
`;

// @ts-ignore
const SBalances = styled(SLanding)`
  height: 100%;
  & h3 {
    padding-top: 30px;
  }
`;

const WrapperInputs = styled.section`
  border-radius: 7px;
  padding: 10px;
  display: flex;
  flex-flow: column wrap;
`;

interface IAppState {
  fetching: boolean;
  address: string;
  library: any;
  connected: boolean;
  chainId: number;
  pendingRequest: boolean;
  result: any | null;
  electionContract: any | null;
  info: any | null;
  currentLeader: number | string,
  showLeader: boolean,
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: '',
  library: null,
  connected: false,
  chainId: 1,
  pendingRequest: false,
  result: null,
  electionContract: null,
  info: null,
  currentLeader: '',
  showLeader: false
};

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;
  public provider: any;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions()
    });
  }

  public componentDidMount() {
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
  }

  public onConnect = async () => {
    this.provider = await this.web3Modal.connect();

    const library = new Web3Provider(this.provider);

    const network = await library.getNetwork();

    const address = this.provider.selectedAddress ? this.provider.selectedAddress : this.provider?.accounts[0];

    const electionContract = getContract(US_ELECTION_ADDRESS, US_ELECTION.abi, library, address);

    await this.setState({
      provider: this.provider,
      library,
      chainId: network.chainId,
      address,
      connected: true,
      electionContract
    });

    await this.subscribeToProviderEvents(this.provider);

  };

  public subscribeToProviderEvents = async (provider: any) => {
    if (!provider.on) {
      return;
    }

    provider.on("accountsChanged", this.changedAccount);
    provider.on("networkChanged", this.networkChanged);
    provider.on("close", this.close);

    await this.web3Modal.off('accountsChanged');
  };

  public async unSubscribe(provider: any) {
    // Workaround for metamask widget > 9.0.3 (provider.off is undefined);
    window.location.reload(false);
    if (!provider.off) {
      return;
    }

    provider.off("accountsChanged", this.changedAccount);
    provider.off("networkChanged", this.networkChanged);
    provider.off("close", this.close);
  }

  public changedAccount = async (accounts: string[]) => {
    if (!accounts.length) {
      // Metamask Lock fire an empty accounts array 
      await this.resetApp();
    } else {
      await this.setState({ address: accounts[0] });
    }

  }

  public networkChanged = async (networkId: number) => {
    const library = new Web3Provider(this.provider);
    const network = await library.getNetwork();
    const chainId = network.chainId;
    await this.setState({ chainId, library });
  }

  public close = async () => {
    this.resetApp();
  }

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    const providerOptions = {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID
        }
      }
    };
    return providerOptions;
  };

  public resetApp = async () => {
    await this.web3Modal.clearCachedProvider();
    localStorage.removeItem("WEB3_CONNECT_CACHED_PROVIDER");
    localStorage.removeItem("walletconnect");
    await this.unSubscribe(this.provider);

    this.setState({ ...INITIAL_STATE });
  };

  public currentLeader = async () => {
    const { electionContract } = this.state;

    const currentLeader = await electionContract.currentLeader();
    console.log(this.state.showLeader);

    await this.setState({ showLeader: !this.state.showLeader })
    await this.setState({ currentLeader });
  };

  public submitElectionResult = async () => {
    const { electionContract } = this.state;

    // const dataArr = [
    //   'Idaho',
    //   51,
    //   50,
    //   24
    // ];

    console.log(electionContract)

    // await this.setState({ fetching: true });
    // const transaction = await electionContract.submitStateResult(dataArr);

    // await this.setState({ transactionHash: transaction.hash });

    // const transactionReceipt = await transaction.wait();
    // if (transactionReceipt.status !== 1) {
    //   // React to failure
    // }
  };

  public render = () => {
    const {
      address,
      connected,
      chainId,
      fetching
    } = this.state;
    return (
      <SLayout>
        <Column maxWidth={1000} spanHeight>
          <Header
            connected={connected}
            address={address}
            chainId={chainId}
            killSession={this.resetApp}
          />
          <SContent>
            {fetching ? (
              <Column center>
                <SContainer>
                  <Loader />
                </SContainer>
              </Column>
            ) : (
              <SLanding center>
                {!this.state.connected && <ConnectButton onClick={this.onConnect} />}
              </SLanding>
            )}
          </SContent>
        </Column>
        <Column maxWidth={1000} spanHeight>
          <button onClick={this.currentLeader}>check leader</button>
          <button onClick={this.submitElectionResult}>print contract</button>

          {this.state.showLeader && <section>{this.state.currentLeader}</section>}
          <WrapperInputs>
            <section >
              <label htmlFor="name">name</label>
              <input name="name" placeholder="Chicago" />
              <label htmlFor="votesB">votes Biden</label>
              <input name="votesB" placeholder="500" />
              <label htmlFor="votesT">votes Trump</label>
              <input name="votesT" placeholder="500" />
              <label htmlFor="seats">state seats</label>
              <input name="stateSeats" placeholder="20" />
            </section>
          </WrapperInputs>

        </Column>
      </SLayout>
    );
  };
}

export default App;
