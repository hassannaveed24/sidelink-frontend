import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import PageHeaderAlt from 'components/layout-components/PageHeaderAlt';
import { Form, Button, message, Space, Row, Col, Card, Input, InputNumber } from 'antd';
import Flex from 'components/shared-components/Flex';
import { patch, post } from 'utils/server';
import { useQueryClient, useMutation } from 'react-query';
import utils from 'utils';
import { useDidMount, useKey } from 'rooks';

const initialValues = {
	name: '',
	phone: '',
};

const rules = {
	name: [
		{
			required: true,
			type: 'string',
			min: 4,
		},
	],
	phone: [],
};

const ManageSupplier = (props) => {
	const location = useLocation();
	const history = useHistory();
	const queryClient = useQueryClient();

	const [form] = Form.useForm();

	const editingState = useMemo(() => location.state, [location.state]);

	const handleDiscard = useCallback(() => history.push('/app/contacts'), [history]);

	const addMutation = useMutation((payload) => post('/contacts', payload), {
		onSuccess: async () => {
			await queryClient.invalidateQueries('suppliers');
			history.push('/app/contacts', { flashMessage: 'Supplier has been added successfully' });
		},
		onError: (error) => {
			message.error(utils.getErrorMessages(error));
		},
	});

	const editProductMutation = useMutation((payload) => patch(`/contacts/id/${editingState._id}`, payload), {
		onSuccess: async () => {
			await queryClient.invalidateQueries('suppliers');
			history.push('/app/contacts', { flashMessage: 'Supplier has been updated successfully' });
		},
		onError: (error) => {
			message.error(utils.getErrorMessages(error));
		},
	});

	const mutation = useMemo(
		() => (editingState ? editProductMutation : addMutation),
		[addMutation, editProductMutation, editingState]
	);

	const onFinish = useCallback(() => {
		form.validateFields().then((values) => {
			mutation.mutate({ ...values, type: 'SUPPLIER' });
		});
	}, [form, mutation]);

	useKey(['Escape'], handleDiscard);

	useDidMount(() => {
		if (editingState) form.setFieldsValue(editingState);
	});

	return (
		<>
			<Form
				layout="vertical"
				form={form}
				name="supplier_form"
				className="ant-advanced-search-form"
				initialValues={initialValues}
				autoComplete="off"
			>
				<PageHeaderAlt className="border-bottom" overlap>
					<div className="container">
						<Flex className="py-2" mobileFlex={false} justifyContent="between" alignItems="center">
							<h2 className="mb-0">{editingState ? 'Update Supplier' : `Add New Supplier`}</h2>
							<Flex alignItems="center">
								<Space>
									<Button className="mr-2" onClick={handleDiscard} disabled={mutation.isLoading}>
										Discard
									</Button>
									<Button type="primary" onClick={() => onFinish()} htmlType="submit" loading={mutation.isLoading}>
										{editingState ? 'Update Supplier' : 'Add Supplier'}
									</Button>
								</Space>
							</Flex>
						</Flex>
					</div>
				</PageHeaderAlt>
				<div className="container" style={{ marginTop: 120 }}>
					<Row gutter={32}>
						<Col sm={24} md={17}>
							<Card title="Basic Info">
								<Row>
									<Col sm={24}>
										<Form.Item name="name" label="Supplier name" rules={rules.name}>
											<Input />
										</Form.Item>
									</Col>
								</Row>

								<Row gutter={32}>
									<Col sm={24}>
										<Form.Item name="phone" label="Phone" rules={rules.phone}>
											<Input />
										</Form.Item>
									</Col>
								</Row>
							</Card>
						</Col>
					</Row>
				</div>
			</Form>
		</>
	);
};

export default ManageSupplier;
