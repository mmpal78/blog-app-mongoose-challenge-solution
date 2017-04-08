const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);


// Create Array of Blog Posts
function seedBlog(){
	console.info('Seeding DB');
	const seedData = [];

	for(let i = 0; i < 10; i++){
		seedData.push(generateBlogPost());
	}		
	return BlogPost.insertMany(seedData);
}

// Create Individual Blog Post
function generateBlogPost(){	
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		title: faker.lorem.sentence(),
		content: faker.lorem.paragraphs(),
		created: faker.date.past()
	};
}

//  Remove Testing DB
function tearDown() {
	console.info('Tearing Down DB');
	return mongoose.connection.dropDatabase();
}

describe('Build testing processes', function(){
	before(function(){
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function(){
		return seedBlog();
	});

	afterEach(function(){
		return tearDown();
	})

	after(function(){
		return closeServer();
	})

	describe('GET request', function(){
		it('should return all blog posts', function(){
			let res;
			return chai.request(app)
			.get('/posts')
			.then(function(_res){
				res = _res;
				res.should.have.status(200);
				res.body.should.have.length.of.at.least(1);
				return BlogPost.count();
			})
			.then(function(count){
				res.body.should.have.length.of(count);
			})
		})
	

		it('should return posts with correct fields', function(){
			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res){
					res.should.have.status(200);
					res.should.be.json;
					res.body.should.be.a('array');
					res.body.should.have.length.of.at.least(1);

					res.body.forEach(function(post) {
						post.should.be.a('object');
						post.should.include.keys('author', 'title', 'content', 'created', 'id');
						});
						resPost = res.body[0];				
						return BlogPost.findById(resPost.id);		
					})
				.then(function(post){
					resPost.id.should.equal(post._id.toString());
					resPost.author.should.equal(`${post.author.firstName} ${post.author.lastName}`);
					resPost.title.should.equal(post.title);
					resPost.created.should.equal(new Date(post.created).toISOString());
				});
			});
		});

	describe('POST request', function(){
		it('should add new post', function(){
			const newPost = generateBlogPost();
			let rPost
			return chai.request(app)
				.post('/posts')
				.send(newPost)
				.then(function(res){
					res.should.have.status(201);
					res.should.be.json;
					res.body.should.be.a('object');
					res.body.should.include.keys('id', 'author', 'title', 'content', 'created');
					res.body.author.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`)
					rPost = res.body;					
					return BlogPost.findById(rPost.id.toString());
				})
				.then(function(post){
					const fName = post.author.firstName;
					const lName = post.author.lastName;
					const name = `${fName} ${lName}`;
					console.log('POOOOST: ' + post)
					name.should.equal(`${newPost.author.firstName} ${newPost.author.lastName}`);					
				})
		})

	})

	describe('PUT request teset', function(){
		it('should update blog post', function(){
			const updatePost = {
				author: {
					firstName: 'Foo',
					lastName: 'Bar'
				},
				title: 'Testing 123',								
			};

			return BlogPost
			.findOne()
			.exec()
			.then(function(post){
				updatePost.id = post.id;

				return chai.request(app)
				.put(`/posts/${post.id}`)
				.send(updatePost);
			})
			.then(function(res){
				res.should.have.status(201);
				return BlogPost.findById(updatePost.id).exec();
			})
			.then(function(post){
				const fName = post.author.firstName;
				const lName = post.author.lastName;
				const name = `${fName} ${lName}`;
				name.should.equal(`${updatePost.author.firstName} ${updatePost.author.lastName}`)
			})
		})
	})

	describe('DELETE request test', function(){
		it('should delete post by id', function(){
			let post;

			return BlogPost
			.findOne()
			.exec()
			.then(function(_res){
				post = _res;
				console.log('POOOOST: ' + post)
				return chai.request(app).delete(`/posts/${post._id}`)
			})
			.then(function(res){
				res.should.have.status(204);
				return BlogPost.findById(post._id)
			})
			.then(function(res){
				should.not.exist(res);
			})
		})
	})


})





























