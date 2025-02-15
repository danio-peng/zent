import { PureComponent } from 'react';
import classnames from 'classnames';

import ColGroup from './ColGroup';
import {
  GridSortType,
  IGridOnChangeConfig,
  IGridScrollDelta,
  IGridInnerFixedType,
} from './types';
import { IGridInnerColumn, IGridProps } from './Grid';
import Store from './Store';
import isNil from '../utils/isNil';
import ToolTip from '../tooltip';
import Icon from '../icon';

export interface IGridHeaderProps<Data> {
  size: IGridProps['size'];
  prefix: string;
  columns: Array<IGridInnerColumn<Data>>;
  sortType: GridSortType;
  defaultSortType?: GridSortType;
  sortBy?: string;
  onChange: (config: IGridOnChangeConfig) => void;
  store: Store;
  fixed?: IGridInnerFixedType;
  fixedColumnsHeadRowsHeight: Array<number | string>;
  scroll: IGridScrollDelta;
}

interface IHeaderCell {
  key: string | number;
  className: string;
  children?: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
}

interface IGridHeaderState<> {
  rows: Array<Array<IHeaderCell>>;
}

const sortToolTipMap = new Map<GridSortType, string>([
  ['', '取消排序'],
  ['asc', '点击升序'],
  ['desc', '点击降序'],
]);

class Header<Data> extends PureComponent<
  IGridHeaderProps<Data>,
  IGridHeaderState
> {
  constructor(props: IGridHeaderProps<Data>) {
    super(props);

    this.state = {
      rows: this.getHeaderRows(props),
    };
  }

  unsubscribe: any;

  getSortInfo = (
    column: IGridInnerColumn<Data>,
    props: IGridHeaderProps<Data>
  ) => {
    const { sortBy, sortType = '', defaultSortType = 'desc' } = props;
    const name = column.name;
    let newSortType: GridSortType;

    if (name === sortBy) {
      if (sortType === '') {
        newSortType = defaultSortType;
      } else if (sortType === defaultSortType) {
        newSortType = defaultSortType === 'asc' ? 'desc' : 'asc';
      } else {
        newSortType = '';
      }
    }

    if (name !== sortBy) {
      newSortType = defaultSortType;
    }

    return {
      sortBy: name,
      sortType: newSortType,
      sortTooltip: sortToolTipMap.get(newSortType),
    };
  };

  getChildrenAndEvents = (
    column: IGridInnerColumn<Data>,
    props: IGridHeaderProps<Data>
  ) => {
    const { prefix, sortBy, sortType, onChange } = props;
    const cn = classnames(`${prefix}-grid-thead-sort`, {
      [`${prefix}-grid-thead-sort-${sortType}`]:
        sortType && column.name === sortBy,
    });

    if (column.needSort) {
      const { sortBy, sortType, sortTooltip } = this.getSortInfo(column, props);

      return {
        children: (
          <ToolTip title={sortTooltip} position="top-center" cushion={12}>
            <div className={`${prefix}-grid-thead-sort-btn`}>
              {column.title}
              <span className={cn}>
                <Icon type="caret-up" className="caret-up" />
                <Icon type="caret-down" className="caret-down" />
              </span>
            </div>
          </ToolTip>
        ),
        onClick: () => onChange({ sortBy, sortType }),
      };
    }
    return {
      children: column.title,
    };
  };

  getHeaderRows = (
    passProps?: IGridHeaderProps<Data>,
    columns?: Array<IGridInnerColumn<Data>>,
    currentRow = 0,
    rows: Array<Array<IHeaderCell>> = []
  ) => {
    const props = passProps || this.props;
    const { prefix, columns: propsColumns } = props;

    columns = columns || propsColumns;
    rows[currentRow] = rows[currentRow] || [];

    (columns || []).forEach((column, index) => {
      if (column.rowSpan && rows.length < column.rowSpan) {
        while (rows.length < column.rowSpan) {
          rows.push([]);
        }
      }
      const {
        name,
        key,
        className,
        colSpan,
        rowSpan,
        nowrap,
        noWrap,
        textAlign,
      } = column;
      const cell: IHeaderCell = {
        key: name || key || index,
        className: classnames(`${prefix}-grid-th`, className, {
          [`${prefix}-grid-text-align-${textAlign}`]: textAlign,
          [`${prefix}-grid-nowrap`]: noWrap ?? nowrap,
          [`${prefix}-grid-th-selection`]:
            ['selection-column', 'selection-column-single'].indexOf(key) !== -1,
          [`${prefix}-grid-th-expand`]: key === 'expand-column',
          [`${prefix}-grid-th-sortable`]: column.needSort,
        }),
        ...this.getChildrenAndEvents(column, props),
      };

      if (column.children) {
        this.getHeaderRows(props, column.children, currentRow + 1, rows);
      }
      if (typeof colSpan === 'number') {
        cell.colSpan = colSpan;
      }
      if (typeof rowSpan === 'number') {
        cell.rowSpan = rowSpan;
      }
      if (cell.colSpan !== 0) {
        rows[currentRow].push(cell);
      }
    });

    return rows.filter(row => row.length > 0);
  };

  subscribe = () => {
    const { store } = this.props;
    this.unsubscribe = store.subscribe('columns', () => {
      this.setState({ rows: this.getHeaderRows() });
    });
  };

  componentDidMount() {
    this.subscribe();
  }

  // 等重构再删了吧，改不动
  // eslint-disable-next-line react/no-deprecated
  componentWillReceiveProps(nextProps: IGridHeaderProps<Data>) {
    if (
      nextProps.columns !== this.props.columns ||
      nextProps.sortType !== this.props.sortType ||
      nextProps.sortBy !== this.props.sortBy
    ) {
      this.setState({
        rows: this.getHeaderRows(nextProps),
      });
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  renderThead() {
    const { prefix, fixed, fixedColumnsHeadRowsHeight } = this.props;
    const { rows } = this.state;
    const headerHeight = fixedColumnsHeadRowsHeight[0];
    const rowsLen = rows.length;

    return (
      <thead className={`${prefix}-grid-thead`}>
        {(rows || []).map((row, index) => {
          const height =
            fixed && headerHeight
              ? (headerHeight as number) / rowsLen
              : undefined;
          return (
            <tr
              key={index}
              className={`${prefix}-grid-tr`}
              style={{
                height,
              }}
            >
              {row.map(({ key, ...props }) => (
                <th key={key} {...(props as any)} />
              ))}
            </tr>
          );
        })}
      </thead>
    );
  }

  render() {
    const { scroll, fixed, prefix, columns, size } = this.props;
    const headerStyle: React.CSSProperties = {};
    if (!fixed && !isNil(scroll.x)) {
      headerStyle.width = scroll.x;
    }
    return scroll.y ? (
      <table
        className={`${prefix}-grid-table ${prefix}-grid-table-${size}`}
        style={headerStyle}
      >
        <ColGroup columns={columns} />
        {this.renderThead()}
      </table>
    ) : (
      this.renderThead()
    );
  }
}

export default Header;
