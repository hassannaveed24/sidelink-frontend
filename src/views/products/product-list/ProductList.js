import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Table, Input, Button, Menu, message, Dropdown, Space, Spin, Result, Skeleton } from 'antd';
import {
	UploadOutlined,
	DownOutlined,
	EditOutlined,
	DeleteOutlined,
	SearchOutlined,
	PlusCircleOutlined,
} from '@ant-design/icons';
import {
	BulkActionDropdownMenu,
	EllipsisDropdown,
	Flex,
	SingleDropdownMenu,
	Spinner,
	SpinnerContainer,
	TableSkeleton,
} from 'components/shared-components';

import NumberFormat from 'react-number-format';
import { useHistory, useLocation } from 'react-router-dom';
import Utils, { useTableUtility } from 'utils';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { del, get } from 'utils/server';
import BulkImport from './BulkImport.modal';
import { useDidMount, useKey, useToggle } from 'rooks';
import { When } from 'react-if';
import getRenderers from 'utils/tableRenderers';
import PLACEHOLDER_DATA from 'utils/data';

const getTableColumns = ({ pagingCounter, onEdit, onDelete, deletingIds, isPlaceholderData }) => {
	const { indexRenderer, defaultRenderer, customRenderer, actionRenderer } = getRenderers(isPlaceholderData);

	return [
		{
			width: 0,
			title: '#',
			render: indexRenderer(pagingCounter),
		},
		{
			title: 'Product',
			dataIndex: 'name',
			sorter: true,
			render: defaultRenderer(),
		},
		{
			title: 'Price',
			dataIndex: 'price',
			sorter: true,
			render: customRenderer((price) => (
				<div>
					<NumberFormat
						displayType={'text'}
						value={price}
						prefix={'PKR '}
						thousandSeparator
						thousandsGroupStyle={'lakh'}
					/>
				</div>
			)),
		},
		{
			title: 'SKU',
			dataIndex: 'sku',
			sorter: true,
			render: defaultRenderer(),
		},
		{
			title: 'Action',
			fixed: 'right',
			width: 150,
			dataIndex: 'actions',
			render: actionRenderer((row, elm) => (
				<div className="text-right">
					{deletingIds.includes(elm._id) ? (
						<Spin />
					) : (
						<EllipsisDropdown menu={<SingleDropdownMenu row={elm} onEdit={onEdit} onDelete={onDelete} />} />
					)}
				</div>
			)),
		},
	];
};

const ProductList = () => {
	const history = useHistory();
	const location = useLocation();
	const queryClient = useQueryClient();
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);
	const [deletingIds, setDeletingIds] = useState([]);

	const { page, limit, sort, search } = useTableUtility();

	const [isModal, toggleModal] = useToggle();

	const apiParams = useMemo(
		() => ({ page: page.value, limit: limit.value, sort: sort.value, search: search.debounced }),
		[limit.value, page.value, search.debounced, sort.value]
	);

	const query = useQuery(
		['products', apiParams],
		() =>
			get('/products', {
				params: apiParams,
			}),
		{ placeholderData: PLACEHOLDER_DATA.PRODUCTS }
	);

	const deleteProductMutation = useMutation((payload) => del(`/products/id/${payload}`), {
		onSuccess: (response, payload) => {
			const ids = payload.split(',');
			setSelectedRowKeys((prev) => prev.filter((id) => !ids.includes(id)));
			setDeletingIds((prev) => prev.filter((id) => !ids.includes(id)));
			message.success(Utils.getDeletedSuccessfullyMessage('Product', 's', ids.length));
			queryClient.invalidateQueries('products');
		},
		onError: (error) => {
			message.error(Utils.getErrorMessages(error));
		},
	});

	const deleteAllMutation = useMutation(() => del(`/products/all`), {
		onSuccess: () => {
			setSelectedRowKeys([]);
			setDeletingIds([]);
			message.success('Products have been deleted successfully');
			queryClient.invalidateQueries('products');
		},
		onError: (error) => {
			message.error(Utils.getErrorMessages(error));
		},
	});

	const handleAddProduct = useCallback(() => {
		history.push(`/app/products/manage`);
	}, [history]);

	const handleEdit = useCallback(
		(row) => {
			history.push('/app/products/manage', row);
		},
		[history]
	);

	const handleBulkDelete = useCallback(() => {
		var confirm = window.confirm(`Are you sure you want to delete selected products?`);
		if (!confirm) return;

		const ids = selectedRowKeys.join(',');
		deleteProductMutation.mutate(ids);
		setDeletingIds([...selectedRowKeys]);
	}, [deleteProductMutation, selectedRowKeys]);

	const handleDelete = useCallback(
		(row) => {
			var confirm = window.confirm('Are you sure to delete the product?');
			if (!confirm) return;

			const id = row._id;
			deleteProductMutation.mutate(id);
			setDeletingIds((prev) => [...prev, id]);
		},
		[deleteProductMutation]
	);

	const onSearch = useCallback(
		(e) => {
			const value = e.currentTarget.value;
			search.set(value);
			setSelectedRowKeys([]);
		},
		[search]
	);

	const handleChangePagination = useCallback(
		(p, pageSize) => {
			page.set(p);
			limit.set(pageSize);
		},
		[limit, page]
	);

	const tablePagination = useMemo(
		() => ({
			pageSize: limit.value,
			responsive: true,
			showLessItems: true,
			showSizeChanger: true,
			total: query?.data?.totalDocs,
			onChange: handleChangePagination,
		}),
		[handleChangePagination, limit.value, query?.data?.totalDocs]
	);

	const getCheckboxProps = useCallback(
		(row) => ({
			disabled: deletingIds.includes(row._id) || query.isPlaceholderData,
			name: row.name,
		}),
		[deletingIds, query.isPlaceholderData]
	);

	const tableRowSelection = useMemo(
		() => ({
			selectedRowKeys,
			type: 'checkbox',
			preserveSelectedRowKeys: false,
			onChange: setSelectedRowKeys,
			getCheckboxProps,
		}),
		[getCheckboxProps, selectedRowKeys]
	);

	const tableProps = useMemo(
		() => ({
			rowKey: '_id',
			loading: query.isLoading || deleteProductMutation.isLoading,
			pagination: tablePagination,
			dataSource: query.data?.docs,
			rowSelection: tableRowSelection,
			onChange: Utils.handleChangeSort(sort.set),
			columns: getTableColumns({
				pagingCounter: query.data?.pagingCounter,
				onEdit: handleEdit,
				onDelete: handleDelete,
				deletingIds,
				isPlaceholderData: query.isPlaceholderData,
			}),
		}),
		[
			deleteProductMutation.isLoading,
			deletingIds,
			handleDelete,
			handleEdit,
			query.data?.docs,
			query.data?.pagingCounter,
			query.isLoading,
			query.isPlaceholderData,
			sort.set,
			tablePagination,
			tableRowSelection,
		]
	);

	useDidMount(() => {
		Utils.showFlashMessage(history, location, message);
	});

	useEffect(Utils.scrollToTop, [page, limit]);

	useKey(['Enter'], handleAddProduct);

	useEffect(() => {
		if (query.data?.hasNextPage) {
			const apiParams = { page: page.value + 1, limit: limit.value, search: search.debounced, sort: sort.value };
			queryClient.prefetchQuery(['products', apiParams], () => get('/products', { params: apiParams }));
		}
	}, [query.data, page, limit.value, sort.value, search.debounced, queryClient]);

	return (
		<>
			<Card>
				<Flex alignItems="center" justifyContent="between" mobileFlex={false}>
					<Flex className="mb-1" mobileFlex={false}>
						<When condition={query.isSuccess}>
							<Input placeholder="Search" prefix={<SearchOutlined />} onChange={onSearch} />
						</When>
					</Flex>
					<Flex>
						<Space>
							<Dropdown
								overlay={
									<BulkActionDropdownMenu
										onImportCSV={toggleModal}
										onDelete={handleBulkDelete}
										canDelete={selectedRowKeys.length && !deleteAllMutation.isLoading}
										onDeleteAll={deleteAllMutation.mutate}
										canDeleteAll={query.data?.docs.length && !selectedRowKeys.length && !deletingIds.length}
									/>
								}
								trigger={['click']}
							>
								<Button type="secondary">
									Bulk <DownOutlined />
								</Button>
							</Dropdown>
							<Button onClick={handleAddProduct} type="primary" icon={<PlusCircleOutlined />} block>
								Add product
							</Button>
						</Space>
					</Flex>
				</Flex>
				<When condition={query.isError}>
					<Result
						status={500}
						title="Oops.. We're having trouble fetching products!"
						subTitle={Utils.getErrorMessages(query.error)}
						extra={
							<Button type="danger" onClick={query.refetch}>
								Try again
							</Button>
						}
					/>
				</When>
				<When condition={query.isSuccess}>
					<div className="table-responsive">
						<Table {...tableProps} />
					</div>
				</When>
			</Card>
			<BulkImport visible={{ set: toggleModal, value: isModal }} />
		</>
	);
};

export default ProductList;
