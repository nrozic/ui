import React, { KeyboardEvent, Component, ReactElement } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { SuggestionSelectedEventData, ChangeEvent } from 'react-autosuggest';
import { css } from 'emotion';
import { default as IconSearch } from '@material-ui/icons/Search';
// import debounce from 'lodash/debounce';

import InputAdornment from '../../muiComponents/InputAdornment';
import AutoComplete from '../../muiComponents/AutoComplete';
import colors from '../../utils/styles/colors';
import { callSearch } from '../../utils/calls';

export interface State {
  search: string;
  suggestions: unknown[];
  loading: boolean;
  loaded: boolean;
  error: boolean;
}

export type cancelAllSearchRequests = () => void;
export type handlePackagesClearRequested = () => void;
export type handleSearch = (event: React.FormEvent<HTMLInputElement>, { newValue, method }: ChangeEvent) => void;
export type handleClickSearch = (event: KeyboardEvent<HTMLInputElement>, { suggestionValue, method }: { suggestionValue: object[]; method: string }) => void;
export type handleFetchPackages = ({ value: string }) => Promise<void>;
export type onBlur = (event: React.FormEvent<HTMLInputElement>) => void;

const CONSTANTS = {
  API_DELAY: 300,
  PLACEHOLDER_TEXT: 'Search Packages',
  ABORT_ERROR: 'AbortError',
};

export class Search extends Component<RouteComponentProps<{}>, State> {
  constructor(props: RouteComponentProps<{}>) {
    super(props);
    this.state = {
      search: '',
      suggestions: [],
      // loading: A boolean value to indicate that request is in pending state.
      loading: false,
      // loaded: A boolean value to indicate that result has been loaded.
      loaded: false,
      // error: A boolean value to indicate API error.
      error: false,
    };
    this.requestList = [];
  }

  public render(): ReactElement<HTMLElement> {
    const { suggestions, search, loaded, loading, error } = this.state;

    return (
      <AutoComplete
        // color={colors.white}
        // onBlur={this.handleOnBlur}
        onChange={this.handleSearch}
        // onCleanSuggestions={this.handlePackagesClearRequested}
        // onClick={this.handleClickSearch}
        // onSuggestionsFetch={debounce(this.handleFetchPackages, CONSTANTS.API_DELAY)}
        options={suggestions}
        placeholder={CONSTANTS.PLACEHOLDER_TEXT}
        // startAdornment={this.getAdorment()}
        // suggestionsError={error}
        // suggestionsLoaded={loaded}
        // suggestionsLoading={loading}
        // value={search}
      />
    );
  }

  /**
   * Cancel all the requests which are in pending state.
   */
  private cancelAllSearchRequests: cancelAllSearchRequests = () => {
    this.requestList.forEach(request => request.abort());
    this.requestList = [];
  };

  /**
   * Cancel all the request from list and make request list empty.
   */
  private handlePackagesClearRequested: handlePackagesClearRequested = () => {
    this.setState({
      suggestions: [],
    });
  };

  /**
   * onChange method for the input element.
   */
  private handleSearch: handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    // stops event bubbling
    event.stopPropagation();
    if (method === 'type') {
      const value = newValue.trim();
      this.setState(
        {
          search: value,
          loading: true,
          loaded: false,
          error: false,
        },
        () => {
          /**
           * A use case where User keeps adding and removing value in input field,
           * so we cancel all the existing requests when input is empty.
           */
          if (value.length === 0) {
            this.cancelAllSearchRequests();
          }
        }
      );
    }
  };

  /**
   * When an user select any package by clicking or pressing return key.
   */
  private handleClickSearch = (
    event: React.FormEvent<HTMLInputElement>,
    { suggestionValue, method }: SuggestionSelectedEventData<unknown>
  ): void | undefined => {
    const { history } = this.props;
    // stops event bubbling
    event.stopPropagation();
    switch (method) {
      case 'click':
      case 'enter':
        this.setState({ search: '' });
        history.push(`/-/web/detail/${suggestionValue}`);
        break;
    }
  };

  /**
   * Fetch packages from API.
   * For AbortController see: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
   */
  private handleFetchPackages: handleFetchPackages = async ({ value }) => {
    try {
      const controller = new window.AbortController();
      const signal = controller.signal;
      // Keep track of search requests.
      this.requestList.push(controller);
      const suggestions = await callSearch(value, signal);
      // @ts-ignore
      this.setState({
        suggestions,
        loaded: true,
      });
    } catch (error) {
      /**
       * AbortError is not the API error.
       * It means browser has cancelled the API request.
       */
      if (error.name === CONSTANTS.ABORT_ERROR) {
        this.setState({ error: false, loaded: false });
      } else {
        this.setState({ error: true, loaded: false });
      }
    } finally {
      this.setState({ loading: false });
    }
  };

  private requestList: AbortController[];

  public getAdorment(): JSX.Element {
    return (
      <InputAdornment
        className={css`
          color: ${colors.white};
          }
        `}
        position={'start'}>
        <IconSearch />
      </InputAdornment>
    );
  }

  /**
   * As user focuses out from input, we cancel all the request from requestList
   * and set the API state parameters to default boolean values.
   */
  private handleOnBlur: onBlur = event => {
    // stops event bubbling
    event.stopPropagation();
    this.setState(
      {
        loaded: false,
        loading: false,
        error: false,
      },
      () => this.cancelAllSearchRequests()
    );
  };
}

export default withRouter(Search);
